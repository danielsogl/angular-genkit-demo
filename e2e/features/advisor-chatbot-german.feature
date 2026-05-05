Feature: Bot replies in German with a financial-advisor tone
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.
  "System prompt mandates German output" is covered by Vitest in
  src/ai/flows/advisor-chat.flow.spec.ts.

  Scenario: Reply is German for an English question
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "What can you do?"
    Then the assistant reply is in German
