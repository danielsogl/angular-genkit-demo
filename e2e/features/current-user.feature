Feature: Current user
  Mirrors openspec/changes/add-dashboard-ui/specs/current-user/spec.md (UI-observable scenarios).

  Background:
    Given I open the home page

  Scenario: Mock user is returned on first read
    Then the top bar shows the current user's name
    And the avatar placeholder shows the user's initials
    And the avatar placeholder has an accessible name including the full name
