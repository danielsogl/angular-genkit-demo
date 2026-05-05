Feature: Dashboard shell
  Mirrors openspec/changes/add-dashboard-ui/specs/dashboard-shell/spec.md.
  Each scenario name MUST match the corresponding OpenSpec scenario verbatim.

  Background:
    Given I open the home page

  Scenario: Routed view is wrapped in the shell
    Then I see the application header
    And I see a primary navigation landmark
    And I see the main content landmark

  Scenario: Toggle from expanded to collapsed
    When I activate the side navigation toggle
    Then the side navigation is in rail mode
    And the toggle reports "aria-expanded" as "false"

  Scenario: Toggle from collapsed to expanded
    Given the side navigation is collapsed
    When I activate the side navigation toggle
    Then the side navigation is in expanded mode
    And the toggle reports "aria-expanded" as "true"

  Scenario: Active item is announced
    When I navigate to the first placeholder route
    Then the active navigation item carries "aria-current" as "page"

  Scenario: Drawer is closed by default on handset
    Given I open the home page on a mobile viewport
    Then the side navigation drawer is closed
    When I activate the side navigation toggle
    Then the side navigation drawer is open
