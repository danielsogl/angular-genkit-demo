Feature: Application boots
  As a developer
  I want a smoke check that the app responds
  So that I know the BDD pipeline is wired up

  Scenario: Home page returns a document
    Given I open the home page
    Then the page has a title
