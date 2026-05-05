Feature: Chat surface meets accessibility minimums
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.

  Scenario: Panel has an accessible name and role
    Given I open the home page and open the assistant panel
    Then the assistant panel exposes role "dialog" with the German name "Assistent"

  Scenario: Streaming replies are announced
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "Hallo"
    Then the transcript region carries "aria-live" as "polite"

  Scenario: AXE finds no violations
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "Hallo"
    Then AXE reports no "serious" or "critical" violations
