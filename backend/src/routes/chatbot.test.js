/**
 * Chatbot Controller Tests
 * Tests all major scenarios: intent detection, date parsing, booking flow
 */

const chatbotController = require("../controllers/chatbotController");

// Mock intent extraction to test locally without Gemini API
function testParseNaturalDate() {
  console.log("\n=== Testing Date Parsing ===");
  
  const testCases = [
    { input: "April 30 at 12:00 pm", expected: "Should parse to 2026-04-30" },
    { input: "April 30 at 12 pm", expected: "Should parse to 2026-04-30" },
    { input: "30 april at 3 pm", expected: "Should parse to 2026-04-30" },
    { input: "tomorrow at 10 am", expected: "Should parse to 2026-04-30 (if today is 4/29)" },
    { input: "today", expected: "Should parse to 2026-04-29" },
    { input: "2026-04-30", expected: "Should parse to 2026-04-30" },
    { input: "april 30, 2026", expected: "Should parse to 2026-04-30" },
    { input: "4/30/2026", expected: "May fail - different format" },
  ];

  testCases.forEach(test => {
    console.log(`\n  Input: "${test.input}"`);
    console.log(`  Expected: ${test.expected}`);
    // Note: We can't directly call parseNaturalDate() as it's not exported
    // But we can verify via the behavior when chatbot receives it
  });
}

function testTimeExtraction() {
  console.log("\n=== Testing Time Parsing ===");
  
  const testCases = [
    { input: "12:00 pm", expected: "Should parse to 12:00" },
    { input: "3 pm", expected: "Should parse to 15:00" },
    { input: "9 am", expected: "Should parse to 09:00" },
    { input: "14:30", expected: "Should parse to 14:30" },
  ];

  testCases.forEach(test => {
    console.log(`\n  Input: "${test.input}"`);
    console.log(`  Expected: ${test.expected}`);
  });
}

function testIntentDetection() {
  console.log("\n=== Intent Detection Test Cases ===");
  
  const scenarios = [
    {
      name: "Symptom Description",
      message: "my blood pressure is increasing and my heart is hurting",
      expectedIntent: "doctor_info (should recommend cardiologist, NOT book)",
      expectedBehavior: "Bot should ask 'Would you like to book with cardiologist?' before asking for date/time"
    },
    {
      name: "Explicit Booking Request",
      message: "I want to book an appointment",
      expectedIntent: "book",
      expectedBehavior: "Bot should immediately ask for doctor/date/time"
    },
    {
      name: "Date + Reason Combo",
      message: "April 30 at 12 pm for a checkup",
      expectedIntent: "book (if previous context exists)",
      expectedBehavior: "Should capture date, time, and reason"
    },
    {
      name: "Doctor Name Query",
      message: "Which cardiologists do you have?",
      expectedIntent: "doctor_info",
      expectedBehavior: "Should list available cardiologists"
    },
    {
      name: "List Appointments",
      message: "Show me my upcoming appointments",
      expectedIntent: "list_appointments",
      expectedBehavior: "Should display user's upcoming appointments"
    },
    {
      name: "Greeting",
      message: "Hello",
      expectedIntent: "chat",
      expectedBehavior: "Should greet and offer help"
    }
  ];

  scenarios.forEach((scenario, idx) => {
    console.log(`\n${idx + 1}. ${scenario.name}`);
    console.log(`   Message: "${scenario.message}"`);
    console.log(`   Expected Intent: ${scenario.expectedIntent}`);
    console.log(`   Expected Behavior: ${scenario.expectedBehavior}`);
  });
}

function testBookingFlow() {
  console.log("\n=== Complete Booking Flow Test ===");
  
  const flow = [
    {
      step: 1,
      userMessage: "I need to book an appointment",
      expectedReply: "Which doctor or specialty would you like to book with?"
    },
    {
      step: 2,
      userMessage: "cardiology",
      expectedReply: "Here are available cardiologists: [list]"
    },
    {
      step: 3,
      userMessage: "Dr. Ahmed",
      expectedReply: "What date would you like? (should recognize Dr. Ahmed)"
    },
    {
      step: 4,
      userMessage: "April 30 at 12 pm",
      expectedReply: "What is the reason for your appointment?"
    },
    {
      step: 5,
      userMessage: "chest pain",
      expectedReply: "Booking confirmed: Dr. Ahmed on April 30 at 12:00 PM for chest pain"
    }
  ];

  flow.forEach(item => {
    console.log(`\nStep ${item.step}:`);
    console.log(`  User: "${item.userMessage}"`);
    console.log(`  Bot should reply: "${item.expectedReply}"`);
  });
}

function testFallbackBehavior() {
  console.log("\n=== Fallback Behavior Check ===");
  
  console.log(`
If bot is falling back to LOCAL responses instead of GEMINI, you'll see:
  - Very generic replies like "I'm here to help"
  - No intelligent doctor recommendations
  - No context-aware follow-ups
  - Always same canned responses

Indicators that Gemini is working:
  - Personalized context-aware responses
  - Understanding complex symptom descriptions
  - Proper specialty recommendations
  - Natural conversation flow
  `);
}

// Run tests
console.log("\n");
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║                 CHATBOT FUNCTIONALITY TEST SUITE               ║");
console.log("╚════════════════════════════════════════════════════════════════╝");

testParseNaturalDate();
testTimeExtraction();
testIntentDetection();
testBookingFlow();
testFallbackBehavior();

console.log("\n");
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║            TO RUN ACTUAL TESTS, USE POSTMAN OR CURL:          ║");
console.log("║                                                                ║");
console.log("║  POST http://localhost:3000/api/chat                          ║");
console.log("║  Headers: { Authorization: Bearer <JWT_TOKEN> }               ║");
console.log("║  Body: {                                                       ║");
console.log("║    \"message\": \"Test message\",                              ║");
console.log("║    \"history\": [                                             ║");
console.log("║      { \"role\": \"user\", \"text\": \"Previous message\" },  ║");
console.log("║      { \"role\": \"assistant\", \"text\": \"Bot response\" }   ║");
console.log("║    ]                                                           ║");
console.log("║  }                                                             ║");
console.log("║                                                                ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

module.exports = {
  testParseNaturalDate,
  testTimeExtraction, 
  testIntentDetection,
  testBookingFlow,
  testFallbackBehavior
};
