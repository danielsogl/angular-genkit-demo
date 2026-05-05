Feature: Chat flow is exposed via the SSR Express server
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.
  "Flow input contract is enforced by Zod schema" is covered by Vitest in
  src/ai/flows/advisor-chat.flow.spec.ts.

  Scenario: Endpoint exists at /api/chat
    Given I open the home page
    Then the chat endpoint responds with a non-404 status

  Scenario: Flow streams text chunks
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "Hallo"
    Then the assistant reply grows as chunks arrive
