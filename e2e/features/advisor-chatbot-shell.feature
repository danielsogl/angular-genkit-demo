Feature: Shell hosts the advisor chat surface
  Mirrors openspec/changes/add-advisor-chatbot/specs/dashboard-shell/spec.md.
  "Routed components do not render their own launcher" is covered by Vitest in
  src/app/shell/dashboard-shell/dashboard-shell.spec.ts.

  Scenario: Launcher renders inside the shell on every route
    Given I open the home page
    When I navigate through every shell route
    Then exactly one assistant FAB is in the document on each route

  Scenario: Launcher does not affect existing shell chrome
    Given I open the home page
    Then the top bar still shows the current user's name
    And the side navigation toggle is operable
    And the routed content occupies the same bounding box as before
