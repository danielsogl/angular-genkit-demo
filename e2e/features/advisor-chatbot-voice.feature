Feature: Composer offers a voice input toggle
  Mirrors openspec/changes/add-voice-input/specs/advisor-chatbot/spec.md.

  Scenario: Mic button is visible in the composer
    Given I open the home page and open the assistant panel
    Then a button labelled "Spracheingabe starten" is visible inside the composer
    And the mic button sits between the message input and the send button

  Scenario: Mic button reflects pressed state
    Given the speech recognition service is stubbed to capture activations
    And I open the home page and open the assistant panel
    When I activate the mic button
    Then the mic button has aria-pressed "true"
    And the mic button is labelled "Spracheingabe stoppen"

  Scenario: Mic disabled while a reply streams
    Given the chat endpoint is stubbed with a delayed streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "Bitte hilf mir"
    Then the mic button is disabled
