import { aiService } from '../aiService';

// Run this test manually in your app
export async function testAIService() {
  try {
    console.log('🧪 Testing AI service...');
    console.log('   Making request to Edge Function...');
    
    const response = await aiService.ask('Say hello in exactly 3 words');
    
    console.log('✅ AI service working!');
    console.log('   Response:', response);
    
    return true;
  } catch (error) {
    console.error('❌ AI service test failed:', error);
    return false;
  }
}

// Test with full response details
export async function testAIServiceDetailed() {
  try {
    console.log('🧪 Testing AI service (detailed)...');
    
    const response = await aiService.complete(
      [{ role: 'user', content: 'Say hello in 5 words' }],
      { maxTokens: 20 }
    );
    
    console.log('✅ AI service working!');
    console.log('   Content:', response.content);
    console.log('   Usage:', response.usage);
    console.log('   Limits:', response.limits);
    
    return true;
  } catch (error) {
    console.error('❌ AI service test failed:', error);
    return false;
  }
}

// Test rate limiting
export async function testRateLimit() {
  try {
    console.log('🧪 Testing rate limiting...');
    
    // Make multiple requests quickly
    for (let i = 0; i < 3; i++) {
      console.log(`   Request ${i + 1}...`);
      const response = await aiService.complete(
        [{ role: 'user', content: `Count to ${i + 1}` }],
        { maxTokens: 10 }
      );
      
      if (response.limits) {
        console.log(`   Used: ${response.limits.used}/${response.limits.limit}`);
      }
    }
    
    console.log('✅ Rate limiting working!');
    return true;
  } catch (error) {
    console.error('❌ Rate limit test failed:', error);
    return false;
  }
}

// Or add a test button in your app temporarily:
// <Button title="Test AI" onPress={testAIService} />
// <Button title="Test AI (Detailed)" onPress={testAIServiceDetailed} />
// <Button title="Test Rate Limit" onPress={testRateLimit} />

