Feature: Theming
  Mirrors openspec/changes/add-dashboard-ui/specs/theming/spec.md.

  Background:
    Given I open the home page

  Scenario: User selects dark mode
    When I select the "dark" theme in the theme switcher
    Then the html element has the "dark-mode" class
    And the theme switcher reports "dark" as the active option

  Scenario: User selects light mode
    Given I select the "dark" theme in the theme switcher
    When I select the "light" theme in the theme switcher
    Then the html element does not have the "dark-mode" class
    And the theme switcher reports "light" as the active option

  Scenario: Selection survives reload
    Given I select the "dark" theme in the theme switcher
    When I reload the page
    Then the html element has the "dark-mode" class
    And the theme switcher reports "dark" as the active option
