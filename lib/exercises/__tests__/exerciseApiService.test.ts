import { exerciseApiService } from '../exerciseApiService';

// Run this test manually in your app
export async function testExerciseService() {
  try {
    console.log('🧪 Testing Exercise service...');
    console.log('   Searching for "bench"...');
    
    const exercises = await exerciseApiService.searchByName('bench');
    
    console.log('✅ Exercise service working!');
    console.log(`   Found ${exercises.length} exercises`);
    if (exercises.length > 0) {
      console.log('   First result:', exercises[0].name);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exercise service test failed:', error);
    return false;
  }
}

// Test different search methods
export async function testExerciseServiceDetailed() {
  try {
    console.log('🧪 Testing Exercise service (detailed)...');
    
    // Test 1: Search by name
    console.log('   Test 1: Search by name...');
    const searchResults = await exerciseApiService.searchByName('press');
    console.log(`   ✓ Found ${searchResults.length} exercises`);
    
    // Test 2: Get by body part
    console.log('   Test 2: Get by body part (chest)...');
    const chestExercises = await exerciseApiService.getByBodyPart('chest');
    console.log(`   ✓ Found ${chestExercises.length} chest exercises`);
    
    // Test 3: Get body part list
    console.log('   Test 3: Get body part list...');
    const bodyParts = await exerciseApiService.getBodyPartList();
    console.log(`   ✓ Found ${bodyParts.length} body parts:`, bodyParts.slice(0, 5).join(', '));
    
    console.log('✅ All exercise tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Exercise service test failed:', error);
    return false;
  }
}

// Test single exercise fetch
export async function testSingleExercise() {
  try {
    console.log('🧪 Testing single exercise fetch...');
    
    // First get an exercise to test with
    const exercises = await exerciseApiService.getAll(1, 0);
    
    if (exercises.length === 0) {
      console.log('⚠️ No exercises found');
      return false;
    }
    
    const firstExerciseId = exercises[0].id;
    console.log(`   Fetching exercise: ${firstExerciseId}...`);
    
    const exercise = await exerciseApiService.getById(firstExerciseId);
    
    if (exercise) {
      console.log('✅ Single exercise fetch working!');
      console.log('   Name:', exercise.name);
      console.log('   Body Part:', exercise.bodyPart);
      console.log('   Equipment:', exercise.equipment);
      return true;
    } else {
      console.log('❌ Exercise not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Single exercise test failed:', error);
    return false;
  }
}

// Or add test buttons in your app temporarily:
// <Button title="Test Exercise Search" onPress={testExerciseService} />
// <Button title="Test Exercise (Detailed)" onPress={testExerciseServiceDetailed} />
// <Button title="Test Single Exercise" onPress={testSingleExercise} />

