Feature: Bot greets the advisor by name in German
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.

  Scenario: Greeting includes the advisor's name
    Given I open the home page
    When I activate the assistant FAB
    Then the assistant transcript contains a German greeting that mentions "Daniel Sogl"

  Scenario: Greeting falls back when no user is signed in
    Given I open the home page without a signed-in user
    When I activate the assistant FAB
    Then the assistant transcript contains a neutral German salutation
    And the greeting does not contain "null" or "undefined"

  Scenario: Greeting is deterministic (no flow call)
    Given I record requests to "/api/chat"
    And I open the home page
    When I activate the assistant FAB
    Then the assistant transcript contains a German greeting
    And no request was sent to "/api/chat"
