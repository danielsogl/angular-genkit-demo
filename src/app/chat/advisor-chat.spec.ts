import { ApplicationRef, Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CurrentUserService } from '../user/current-user.service';
import { AdvisorChatService } from './advisor-chat';

interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly initials: string;
}

@Injectable()
class FakeCurrentUserService {
  readonly #user = signal<User | null>(null);
  readonly user = this.#user.asReadonly();
  setUser(user: User | null): void {
    this.#user.set(user);
  }
}

const streamFlowMock = vi.fn();

vi.mock('genkit/beta/client', () => ({
  streamFlow: (...args: unknown[]) => streamFlowMock(...args),
}));

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

const fakeStream = async function* (chunks: string[], delayMs = 0): AsyncIterable<string> {
  for (const chunk of chunks) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield chunk;
  }
};

const setup = (initialUser: User | null = null) => {
  TestBed.configureTestingModule({
    providers: [{ provide: CurrentUserService, useClass: FakeCurrentUserService }],
  });
  const userService = TestBed.inject(CurrentUserService) as unknown as FakeCurrentUserService;
  userService.setUser(initialUser);
  const service = TestBed.inject(AdvisorChatService);
  return { service, userService };
};

describe('AdvisorChatService', () => {
  beforeEach(() => {
    streamFlowMock.mockReset();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Bot greets the advisor by name in German', () => {
    it("Scenario: Greeting includes the advisor's name", () => {
      // Given a user "Daniel Sogl" is signed in
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When the panel seeds the greeting
      service.seedGreeting('Daniel Sogl');
      // Then the displayed messages contain a German greeting with the name
      const messages = service.displayedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toContain('Daniel Sogl');
      expect(messages[0].content).toMatch(/^(Hallo|Guten Tag|Willkommen)/);
      expect(streamFlowMock).not.toHaveBeenCalled();
    });

    it('Scenario: Greeting falls back when no user is signed in', () => {
      // Given no user is signed in
      const { service } = setup(null);
      // When the panel seeds the greeting with null
      service.seedGreeting(null);
      // Then a neutral German salutation is shown without name placeholders
      const messages = service.displayedMessages();
      expect(messages).toHaveLength(1);
      const content = messages[0].content;
      expect(content).toMatch(/Guten Tag|Hallo/);
      expect(content).not.toMatch(/null|undefined/);
    });

    it('Scenario: Greeting is deterministic (no flow call)', () => {
      // Given a fresh service
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When seedGreeting is called twice
      service.seedGreeting('Daniel Sogl');
      service.seedGreeting('Daniel Sogl');
      // Then it is idempotent and never invokes the flow
      expect(service.displayedMessages()).toHaveLength(1);
      expect(streamFlowMock).not.toHaveBeenCalled();
    });
  });

  describe('Errors surface as a German message with a retry action', () => {
    it('Scenario: Flow rejection shows German error', async () => {
      // Given the flow stream rejects
      streamFlowMock.mockImplementation(() => {
        const stream = (async function* (): AsyncGenerator<string, void, void> {
          throw new Error('boom');
          yield ''; // unreachable; satisfies require-yield
        })();
        const output = Promise.reject(new Error('boom'));
        output.catch(() => undefined);
        return {
          stream,
          output,
          streamId: Promise.resolve(null),
        };
      });
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When the advisor sends a message
      service.send('Hallo');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      // Then the resource records an error
      expect(streamFlowMock).toHaveBeenCalledTimes(1);
      expect(service.error()).toBeInstanceOf(Error);
      expect(service.status()).toBe('error');
    });

    it('Scenario: Retry re-invokes the flow with the previous message', async () => {
      // Given a first send rejects
      let calls = 0;
      streamFlowMock.mockImplementation(() => {
        calls += 1;
        if (calls === 1) {
          const stream = (async function* (): AsyncGenerator<string, void, void> {
            throw new Error('boom');
            yield ''; // unreachable; satisfies require-yield
          })();
          const output = Promise.reject(new Error('boom'));
          output.catch(() => undefined);
          return {
            stream,
            output,
            streamId: Promise.resolve(null),
          };
        }
        return {
          stream: fakeStream(['Gerne. ', 'Hier ist die Antwort.']),
          output: Promise.resolve({ reply: 'Gerne. Hier ist die Antwort.' }),
          streamId: Promise.resolve(null),
        };
      });
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      service.send('Hallo');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      const reloadSpy = vi.spyOn(service.replyResource, 'reload');
      // When the advisor retries
      service.retry();
      // Then the resource was reloaded
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });
});
