import { logger } from '@/lib/utils/logger';
/**
 * Admin Review Dashboard for Custom Exercises
 * 
 * Web-based interface for reviewing community-submitted custom exercises.
 * Allows admins to approve/reject submissions and add popular exercises
 * to the main exercise library.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';

interface CustomExercise {
  id: string;
  user_id: string;
  name: string;
  equipment: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  instructions: string[];
  notes?: string;
  measurement_type: string;
  times_used: number;
  unique_users_count: number;
  is_pending_review: boolean;
  is_approved: boolean;
  created_at: string;
  user_email?: string;
}

export default function AdminReviewDashboard() {
  const [pendingExercises, setPendingExercises] = useState<CustomExercise[]>([]);
  const [approvedExercises, setApprovedExercises] = useState<CustomExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<CustomExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'analytics'>('pending');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    try {
      // Load pending exercises
      const { data: pending } = await supabase
        .from('custom_exercises')
        .select(`
          *,
          users:user_id(email)
        `)
        .eq('is_pending_review', true)
        .order('unique_users_count', { ascending: false })
        .order('times_used', { ascending: false })
        .order('created_at', { ascending: false });

      // Load approved exercises
      const { data: approved } = await supabase
        .from('custom_exercises')
        .select(`
          *,
          users:user_id(email)
        `)
        .eq('is_approved', true)
        .order('approval_date', { ascending: false })
        .limit(50);

      setPendingExercises(pending?.map(ex => ({
        ...ex,
        user_email: ex.users?.email
      })) || []);

      setApprovedExercises(approved?.map(ex => ({
        ...ex,
        user_email: ex.users?.email
      })) || []);
    } catch (error) {
      logger.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveAndAddToLibrary = async (exercise: CustomExercise) => {
    if (!confirm(`Add "${exercise.name}" to the main exercise library?`)) {
      return;
    }

    try {
      // 1. Create official exercise in main library
      const { data: newExercise, error: insertError } = await supabase
        .from('exercises')
        .insert({
          name: exercise.name,
          equipment: exercise.equipment,
          category: exercise.category,
          primary_muscles: exercise.primary_muscles,
          secondary_muscles: exercise.secondary_muscles || [],
          instructions: exercise.instructions,
          measurement_type: exercise.measurement_type,
          is_active: true,
          // Track community contribution
          external_id: `community-${exercise.id}`,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Mark custom exercise as approved
      const { error: updateError } = await supabase
        .from('custom_exercises')
        .update({
          is_pending_review: false,
          is_approved: true,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', exercise.id);

      if (updateError) throw updateError;

      // 3. Send notification to user
      await supabase.from('notifications').insert({
        user_id: exercise.user_id,
        type: 'exercise_approved',
        title: 'ðŸŽ‰ Your Exercise Was Added!',
        message: `Your custom exercise "${exercise.name}" has been approved and added to the exercise library. Thank you for contributing!`,
        data: {
          exercise_id: newExercise.id,
          custom_exercise_id: exercise.id,
        },
        is_read: false,
      });

      alert(`âœ… "${exercise.name}" has been added to the library!`);
      setReviewNotes('');
      loadExercises();
    } catch (error: any) {
      logger.error('Error approving exercise:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const rejectExercise = async (exercise: CustomExercise) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!confirm(`Reject "${exercise.name}"?`)) {
      return;
    }

    try {
      // Mark as rejected
      await supabase
        .from('custom_exercises')
        .update({
          is_pending_review: false,
          is_approved: false,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          review_notes: reviewNotes || null,
        })
        .eq('id', exercise.id);

      // Notify user
      await supabase.from('notifications').insert({
        user_id: exercise.user_id,
        type: 'exercise_rejected',
        title: 'Exercise Submission Update',
        message: `Your custom exercise "${exercise.name}" was reviewed. Reason: ${rejectionReason}`,
        data: {
          custom_exercise_id: exercise.id,
          rejection_reason: rejectionReason,
        },
        is_read: false,
      });

      alert(`Rejection notification sent to user`);
      setRejectionReason('');
      setReviewNotes('');
      setSelectedExercise(null);
      loadExercises();
    } catch (error: any) {
      logger.error('Error rejecting exercise:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const deleteCustomExercise = async (exerciseId: string) => {
    if (!confirm('Permanently delete this custom exercise?')) {
      return;
    }

    try {
      await supabase
        .from('custom_exercises')
        .delete()
        .eq('id', exerciseId);

      loadExercises();
    } catch (error: any) {
      logger.error('Error deleting exercise:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Custom Exercise Review</h1>
        <p className="text-gray-400">
          Review community-submitted custom exercises for addition to the main library
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <AlertCircle size={32} className="text-yellow-500" />
            <div>
              <div className="text-3xl font-bold">{pendingExercises.length}</div>
              <div className="text-gray-400">Pending Review</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <CheckCircle size={32} className="text-green-500" />
            <div>
              <div className="text-3xl font-bold">{approvedExercises.length}</div>
              <div className="text-gray-400">Approved</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <TrendingUp size={32} className="text-blue-500" />
            <div>
              <div className="text-3xl font-bold">
                {pendingExercises.reduce((sum, ex) => sum + ex.times_used, 0)}
              </div>
              <div className="text-gray-400">Total Usage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-semibold ${
            activeTab === 'pending'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400'
          }`}
        >
          Pending ({pendingExercises.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-6 py-3 font-semibold ${
            activeTab === 'approved'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400'
          }`}
        >
          Approved ({approvedExercises.length})
        </button>
      </div>

      {/* Exercise List */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingExercises.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No pending exercises to review
            </div>
          ) : (
            pendingExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-2xl font-bold capitalize">{exercise.name}</h3>
                      {exercise.unique_users_count > 1 && (
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                          <TrendingUp size={14} />
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-400">
                      <span className="capitalize">ðŸ“¦ {exercise.equipment}</span>
                      <span className="capitalize">ðŸŽ¯ {exercise.category}</span>
                      <span>ðŸ’ª {exercise.primary_muscles.join(', ')}</span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {exercise.unique_users_count} user{exercise.unique_users_count !== 1 ? 's' : ''}
                      </span>
                      <span>ðŸ” Used {exercise.times_used}x</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(exercise.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {exercise.instructions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-gray-300">
                          {exercise.instructions.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {exercise.notes && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Notes:</h4>
                        <p className="text-gray-300">{exercise.notes}</p>
                      </div>
                    )}

                    <div className="text-sm text-gray-500">
                      Submitted by: {exercise.user_email}
                    </div>
                  </div>

                  <div className="ml-6 space-y-3">
                    <button
                      onClick={() => {
                        setSelectedExercise(exercise);
                        approveAndAddToLibrary(exercise);
                      }}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
                    >
                      <CheckCircle size={18} />
                      Approve & Add
                    </button>

                    <button
                      onClick={() => setSelectedExercise(exercise)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold whitespace-nowrap w-full"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>

                    <button
                      onClick={() => deleteCustomExercise(exercise.id)}
                      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold whitespace-nowrap w-full"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="space-y-4">
          {approvedExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-gray-800 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold capitalize mb-2">{exercise.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>{exercise.equipment}</span>
                    <span>{exercise.category}</span>
                    <span>Used {exercise.times_used}x</span>
                  </div>
                </div>
                <CheckCircle size={24} className="text-green-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Reject "{selectedExercise.name}"
            </h3>

            <div className="mb-4">
              <label className="block mb-2 font-semibold">
                Rejection Reason (sent to user) *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-gray-700 rounded p-3 text-white"
                rows={3}
                placeholder="e.g., Duplicate of existing exercise, incomplete information..."
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-semibold">
                Internal Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-gray-700 rounded p-3 text-white"
                rows={2}
                placeholder="Internal notes for other admins..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => rejectExercise(selectedExercise)}
                className="flex-1 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setSelectedExercise(null);
                  setRejectionReason('');
                  setReviewNotes('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

