import { aiService } from '../aiService';
import { logger } from '@/lib/utils/logger';

// Run this test manually in your app
export async function testAIService() {
  try {
    logger.log('�x�� Testing AI service...');
    logger.log('   Making request to Edge Function...');
    
    const response = await aiService.ask('Say hello in exactly 3 words');
    
    logger.log('�S& AI service working!');
    logger.log('   Response:', response);
    
    return true;
  } catch (error) {
    logger.error('�R AI service test failed:', error);
    return false;
  }
}

// Test with full response details
export async function testAIServiceDetailed() {
  try {
    logger.log('�x�� Testing AI service (detailed)...');
    
    const response = await aiService.complete(
      [{ role: 'user', content: 'Say hello in 5 words' }],
      { maxTokens: 20 }
    );
    
    logger.log('�S& AI service working!');
    logger.log('   Content:', response.content);
    logger.log('   Usage:', response.usage);
    logger.log('   Limits:', response.limits);
    
    return true;
  } catch (error) {
    logger.error('�R AI service test failed:', error);
    return false;
  }
}

// Test rate limiting
export async function testRateLimit() {
  try {
    logger.log('�x�� Testing rate limiting...');
    
    // Make multiple requests quickly
    for (let i = 0; i < 3; i++) {
      logger.log(`   Request ${i + 1}...`);
      const response = await aiService.complete(
        [{ role: 'user', content: `Count to ${i + 1}` }],
        { maxTokens: 10 }
      );
      
      if (response.limits) {
        logger.log(`   Used: ${response.limits.used}/${response.limits.limit}`);
      }
    }
    
    logger.log('�S& Rate limiting working!');
    return true;
  } catch (error) {
    logger.error('�R Rate limit test failed:', error);
    return false;
  }
}

// Or add a test button in your app temporarily:
// <Button title="Test AI" onPress={testAIService} />
// <Button title="Test AI (Detailed)" onPress={testAIServiceDetailed} />
// <Button title="Test Rate Limit" onPress={testRateLimit} />

