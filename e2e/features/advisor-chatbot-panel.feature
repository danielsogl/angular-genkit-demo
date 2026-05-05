Feature: Chat panel opens and closes from the launcher
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.

  Scenario: Panel opens on FAB activation
    Given I open the home page
    When I activate the assistant FAB
    Then the assistant chat panel is open
    And the FAB reports "aria-expanded" as "true"
    And focus is on the message input

  Scenario: Panel closes on FAB activation
    Given I open the home page and open the assistant panel
    When I activate the assistant FAB
    Then the assistant chat panel is closed
    And the FAB reports "aria-expanded" as "false"
    And focus is on the assistant FAB

  Scenario: Panel close via Escape
    Given I open the home page and open the assistant panel
    When I press Escape inside the assistant panel
    Then the assistant chat panel is closed
    And focus is on the assistant FAB

  Scenario: Panel does not block the rest of the app
    Given I open the home page and open the assistant panel
    Then no page-wide backdrop is rendered
    And the side navigation remains interactive
