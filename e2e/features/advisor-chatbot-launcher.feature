Feature: Floating launcher is reachable from every routed view
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.

  Scenario: FAB is present on the default route
    Given I open the home page
    Then a single chat assistant FAB is visible in the bottom-right
    And the FAB has an accessible name "Assistent öffnen"

  Scenario: FAB is keyboard-reachable
    Given I open the home page
    When I tab through the page until the assistant FAB has focus
    Then the assistant FAB is focused

  Scenario: FAB does not duplicate per route
    Given I open the home page
    When I navigate through every shell route
    Then exactly one assistant FAB is in the document on each route
