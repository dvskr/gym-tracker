import { exerciseApiService } from '../exerciseApiService';
import { logger } from '@/lib/utils/logger';

// Run this test manually in your app
export async function testExerciseService() {
  try {
    logger.log('�x�� Testing Exercise service...');
    logger.log('   Searching for "bench"...');
    
    const exercises = await exerciseApiService.searchByName('bench');
    
    logger.log('�S& Exercise service working!');
    logger.log(`   Found ${exercises.length} exercises`);
    if (exercises.length > 0) {
      logger.log('   First result:', exercises[0].name);
    }
    
    return true;
  } catch (error) {
    logger.error('�R Exercise service test failed:', error);
    return false;
  }
}

// Test different search methods
export async function testExerciseServiceDetailed() {
  try {
    logger.log('�x�� Testing Exercise service (detailed)...');
    
    // Test 1: Search by name
    logger.log('   Test 1: Search by name...');
    const searchResults = await exerciseApiService.searchByName('press');
    logger.log(`   �S Found ${searchResults.length} exercises`);
    
    // Test 2: Get by body part
    logger.log('   Test 2: Get by body part (chest)...');
    const chestExercises = await exerciseApiService.getByBodyPart('chest');
    logger.log(`   �S Found ${chestExercises.length} chest exercises`);
    
    // Test 3: Get body part list
    logger.log('   Test 3: Get body part list...');
    const bodyParts = await exerciseApiService.getBodyPartList();
    logger.log(`   �S Found ${bodyParts.length} body parts:`, bodyParts.slice(0, 5).join(', '));
    
    logger.log('�S& All exercise tests passed!');
    return true;
  } catch (error) {
    logger.error('�R Exercise service test failed:', error);
    return false;
  }
}

// Test single exercise fetch
export async function testSingleExercise() {
  try {
    logger.log('�x�� Testing single exercise fetch...');
    
    // First get an exercise to test with
    const exercises = await exerciseApiService.getAll(1, 0);
    
    if (exercises.length === 0) {
      logger.log('�a���� No exercises found');
      return false;
    }
    
    const firstExerciseId = exercises[0].id;
    logger.log(`   Fetching exercise: ${firstExerciseId}...`);
    
    const exercise = await exerciseApiService.getById(firstExerciseId);
    
    if (exercise) {
      logger.log('�S& Single exercise fetch working!');
      logger.log('   Name:', exercise.name);
      logger.log('   Body Part:', exercise.bodyPart);
      logger.log('   Equipment:', exercise.equipment);
      return true;
    } else {
      logger.log('�R Exercise not found');
      return false;
    }
  } catch (error) {
    logger.error('�R Single exercise test failed:', error);
    return false;
  }
}

// Or add test buttons in your app temporarily:
// <Button title="Test Exercise Search" onPress={testExerciseService} />
// <Button title="Test Exercise (Detailed)" onPress={testExerciseServiceDetailed} />
// <Button title="Test Single Exercise" onPress={testSingleExercise} />

