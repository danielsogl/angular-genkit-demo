Feature: Advisor can send a message and receive a streamed reply
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.

  Scenario: Sending a message via the send button
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I type "Was kannst du?" into the message input and click send
    Then a user message containing "Was kannst du?" appears in the transcript
    And the message input is cleared

  Scenario: Sending a message via Enter
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I type "Hallo" into the message input and press Enter
    Then a user message containing "Hallo" appears in the transcript

  Scenario: Streamed reply appears progressively
    Given the chat endpoint is stubbed with a streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "Bitte hilf mir"
    Then the assistant reply grows as chunks arrive

  Scenario: Empty message is ignored
    Given I record requests to "/api/chat"
    And I open the home page and open the assistant panel
    When I press Enter in the empty message input
    Then no request was sent to "/api/chat"

  Scenario: Input disabled while streaming
    Given the chat endpoint is stubbed with a delayed streaming German reply
    And I open the home page and open the assistant panel
    When I send the message "Bitte hilf mir"
    Then the message input is disabled
    And a streaming indicator is visible
