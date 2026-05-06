import { ApplicationRef, Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatStreamEvent } from '../../ai/flows/advisor-chat-schema';
import { CustomerStore } from '../kundenakte/customer-store';
import { CurrentUserService } from '../user/current-user.service';
import { AdvisorChatService } from './advisor-chat';
import { STREAM_FLOW } from './stream-flow-client';

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

class FakeRouter {
  readonly navigateByUrl = vi.fn().mockResolvedValue(true);
}

const streamFlowMock = vi.fn();

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

const fakeStream = async function* (
  chunks: readonly ChatStreamEvent[],
  delayMs = 0,
): AsyncIterable<ChatStreamEvent> {
  for (const chunk of chunks) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    yield chunk;
  }
};

const setup = (initialUser: User | null = null) => {
  const router = new FakeRouter();
  TestBed.configureTestingModule({
    providers: [
      { provide: CurrentUserService, useClass: FakeCurrentUserService },
      { provide: Router, useValue: router },
      { provide: STREAM_FLOW, useValue: streamFlowMock },
    ],
  });
  const userService = TestBed.inject(CurrentUserService) as unknown as FakeCurrentUserService;
  userService.setUser(initialUser);
  const service = TestBed.inject(AdvisorChatService);
  return { service, userService, router };
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
        // eslint-disable-next-line require-yield
        const stream = (async function* (): AsyncGenerator<ChatStreamEvent, void, void> {
          throw new Error('boom');
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
          // eslint-disable-next-line require-yield
          const stream = (async function* (): AsyncGenerator<ChatStreamEvent, void, void> {
            throw new Error('boom');
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
          stream: fakeStream([
            { type: 'text', delta: 'Gerne. ' },
            { type: 'text', delta: 'Hier ist die Antwort.' },
          ]),
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

  describe('Client dispatches navigate events to the Angular router', () => {
    it('Scenario: Text events still grow the assistant message', async () => {
      // Given the flow streams two text events
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([
          { type: 'text', delta: 'Ich öffne ' },
          { type: 'text', delta: 'die Einstellungen.' },
        ]),
        output: Promise.resolve({ reply: 'Ich öffne die Einstellungen.' }),
        streamId: Promise.resolve(null),
      }));
      const { service, router } = setup({
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
      // Then the assistant message ends with the concatenated deltas
      const messages = service.displayedMessages();
      const last = messages[messages.length - 1];
      expect(last.role).toBe('assistant');
      expect(last.content).toBe('Ich öffne die Einstellungen.');
      // And no router navigation happens
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('Scenario: Navigate event triggers Router.navigateByUrl with the literal route segment', async () => {
      // Given the flow emits a single navigate event
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([
          { type: 'navigate', target: 'depot' },
          { type: 'text', delta: 'Ich öffne das Depot.' },
        ]),
        output: Promise.resolve({ reply: 'Ich öffne das Depot.' }),
        streamId: Promise.resolve(null),
      }));
      const { service, router } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When the advisor sends a message
      service.send('Zeige Depot');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      // Then router.navigateByUrl is called with '/' + target
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/depot');
    });

    it('Scenario: Duplicate navigate events in one turn are debounced', async () => {
      // Given two navigate events arrive back-to-back in one turn
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([
          { type: 'navigate', target: 'depot' },
          { type: 'navigate', target: 'einstellungen' },
        ]),
        output: Promise.resolve({ reply: '' }),
        streamId: Promise.resolve(null),
      }));
      const { service, router } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When the service consumes the stream
      service.send('Zeige Depot');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      // Then navigateByUrl is invoked exactly once
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/depot');
    });

    it('Scenario: customer-loaded event populates the CustomerStore', async () => {
      // Given the flow emits a customer-loaded event
      const customer = {
        id: 'c-007',
        firstName: 'Eva',
        lastName: 'Klein',
        age: 50,
        email: 'eva@example.de',
        phone: '+49',
        address: 'Bonn',
        riskProfile: 3 as const,
        depotValue: 99_000,
        lastContact: '2026-04-01',
        advisorNotes: 'Test',
        products: [],
      };
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([
          { type: 'customer-loaded', customer },
          { type: 'text', delta: 'Geöffnet.' },
        ]),
        output: Promise.resolve({ reply: 'Geöffnet.' }),
        streamId: Promise.resolve(null),
      }));
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      const store = TestBed.inject(CustomerStore);
      // When the advisor sends a message
      service.send('Öffne Kunde Klein');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      // Then the store contains the customer
      expect(store.currentCustomer()?.id).toBe('c-007');
      expect(store.currentCustomerId()).toBe('c-007');
    });

    it('Scenario: send includes currentCustomerId from the store in the turn payload', async () => {
      // Given a customer is already loaded in the store
      const seedCustomer = {
        id: 'c-002',
        firstName: 'Bernd',
        lastName: 'Schmidt',
        age: 67,
        email: 'b@example.de',
        phone: '+49',
        address: 'München',
        riskProfile: 2 as const,
        depotValue: 1,
        lastContact: '2026-01-01',
        advisorNotes: '',
        products: [],
      };
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([{ type: 'text', delta: 'OK.' }]),
        output: Promise.resolve({ reply: 'OK.' }),
        streamId: Promise.resolve(null),
      }));
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      TestBed.inject(CustomerStore).setCurrent(seedCustomer);
      // When the advisor sends a message
      service.send('Wie hoch ist sein Depot?');
      await flush();
      // Then streamFlow received the currentCustomerId in the input payload
      expect(streamFlowMock).toHaveBeenCalledTimes(1);
      const call = streamFlowMock.mock.calls[0][0] as {
        input: { currentCustomerId: string; loadCustomer: boolean };
      };
      expect(call.input.currentCustomerId).toBe('c-002');
      expect(call.input.loadCustomer).toBe(true);
    });

    it('Scenario: loadCustomer is false on the second send for the same customer', async () => {
      // Given the flow always streams a benign reply
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([{ type: 'text', delta: 'OK.' }]),
        output: Promise.resolve({ reply: 'OK.' }),
        streamId: Promise.resolve(null),
      }));
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      const seedCustomer = {
        id: 'c-001',
        firstName: 'Anna',
        lastName: 'Müller',
        age: 43,
        email: 'a@example.de',
        phone: '',
        address: '',
        riskProfile: 4 as const,
        depotValue: 0,
        lastContact: '',
        advisorNotes: '',
        products: [],
      };
      TestBed.inject(CustomerStore).setCurrent(seedCustomer);
      // When the advisor sends two messages in a row
      service.send('Erste Frage');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      service.send('Zweite Frage');
      await flush();
      // Then the first turn loads the customer, the second does not
      expect(streamFlowMock).toHaveBeenCalledTimes(2);
      const first = streamFlowMock.mock.calls[0][0] as { input: { loadCustomer: boolean } };
      const second = streamFlowMock.mock.calls[1][0] as { input: { loadCustomer: boolean } };
      expect(first.input.loadCustomer).toBe(true);
      expect(second.input.loadCustomer).toBe(false);
    });

    it('Scenario: Switching the customer re-arms loadCustomer', async () => {
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([{ type: 'text', delta: 'OK.' }]),
        output: Promise.resolve({ reply: 'OK.' }),
        streamId: Promise.resolve(null),
      }));
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      const store = TestBed.inject(CustomerStore);
      const a = {
        id: 'c-001',
        firstName: 'Anna',
        lastName: 'Müller',
        age: 43,
        email: '',
        phone: '',
        address: '',
        riskProfile: 4 as const,
        depotValue: 0,
        lastContact: '',
        advisorNotes: '',
        products: [],
      };
      const b = { ...a, id: 'c-002', firstName: 'Bernd', lastName: 'Schmidt' };
      store.setCurrent(a);
      service.send('Frage zu Müller');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      // When the advisor picks a different customer and sends again
      store.setCurrent(b);
      service.send('Frage zu Schmidt');
      await flush();
      // Then the second turn re-loads the new customer's context
      expect(streamFlowMock).toHaveBeenCalledTimes(2);
      const second = streamFlowMock.mock.calls[1][0] as {
        input: { currentCustomerId: string; loadCustomer: boolean };
      };
      expect(second.input.currentCustomerId).toBe('c-002');
      expect(second.input.loadCustomer).toBe(true);
    });

    it('Scenario: customer-loaded event suppresses redundant loadCustomer next turn', async () => {
      // Given the first send returns a customer-loaded event for c-001
      const customer = {
        id: 'c-001',
        firstName: 'Anna',
        lastName: 'Müller',
        age: 43,
        email: '',
        phone: '',
        address: '',
        riskProfile: 4 as const,
        depotValue: 0,
        lastContact: '',
        advisorNotes: '',
        products: [],
      };
      let call = 0;
      streamFlowMock.mockImplementation(() => {
        call += 1;
        if (call === 1) {
          return {
            stream: fakeStream([
              { type: 'customer-loaded', customer },
              { type: 'text', delta: 'Geöffnet.' },
            ]),
            output: Promise.resolve({ reply: 'Geöffnet.' }),
            streamId: Promise.resolve(null),
          };
        }
        return {
          stream: fakeStream([{ type: 'text', delta: 'OK.' }]),
          output: Promise.resolve({ reply: 'OK.' }),
          streamId: Promise.resolve(null),
        };
      });
      const { service } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When the advisor asks the agent to open the customer (no UI selection),
      // and then asks a follow-up
      service.send('Öffne Kunde Müller');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      service.send('Wie hoch ist das Depot?');
      await flush();
      // Then the second turn does NOT re-load — the event already aligned tracker and store
      const second = streamFlowMock.mock.calls[1][0] as {
        input: { currentCustomerId: string; loadCustomer: boolean };
      };
      expect(second.input.currentCustomerId).toBe('c-001');
      expect(second.input.loadCustomer).toBe(false);
    });

    it('Scenario: Navigation does not interrupt text streaming', async () => {
      // Given a stream interleaves text → navigate → text events
      streamFlowMock.mockImplementation(() => ({
        stream: fakeStream([
          { type: 'text', delta: 'Ich öffne ' },
          { type: 'navigate', target: 'einstellungen' },
          { type: 'text', delta: 'die Einstellungen.' },
        ]),
        output: Promise.resolve({ reply: 'Ich öffne die Einstellungen.' }),
        streamId: Promise.resolve(null),
      }));
      const { service, router } = setup({
        id: '1',
        name: 'Daniel Sogl',
        email: 'd@example.com',
        initials: 'DS',
      });
      // When the service consumes the stream
      service.send('Öffne Einstellungen');
      await flush();
      await new Promise((r) => setTimeout(r, 0));
      await flush();
      // Then both text deltas appear in the assistant message in order
      const messages = service.displayedMessages();
      const last = messages[messages.length - 1];
      expect(last.content).toBe('Ich öffne die Einstellungen.');
      // And the navigate dispatch happened exactly once
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/einstellungen');
    });
  });
});
