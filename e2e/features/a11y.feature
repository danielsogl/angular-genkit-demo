Feature: Accessibility baseline
  The shell must pass automated AXE checks.

  Scenario: AXE finds no violations
    Given I open the home page
    Then AXE reports no "serious" or "critical" violations
