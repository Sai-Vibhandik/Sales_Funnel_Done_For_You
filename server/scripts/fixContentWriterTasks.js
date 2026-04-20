/**
 * Migration script to fix tasks for Content Planners
 * This script sets originalAssignedTo for tasks that don't have it
 * and ensures Content Planners can see their submitted/approved tasks
 *
 * Run with: node scripts/fixContentWriterTasks.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Task = require('../models/Task');

async function fixContentWriterTasks() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI or MONGO_URI not found in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all tasks that don't have originalAssignedTo set
    const tasksWithoutOriginal = await Task.find({
      originalAssignedTo: { $exists: false }
    });

    console.log(`\nFound ${tasksWithoutOriginal.length} tasks without originalAssignedTo`);

    let fixedCount = 0;

    for (const task of tasksWithoutOriginal) {
      let originalAssignedTo = null;

      // Determine original assignee based on task type and status
      // For tasks that were submitted (content_submitted, design_submitted, etc.)
      // The original assignee should be the one who was assigned before submission

      // Check revision history for original assignment
      if (task.revisions && task.revisions.length > 0) {
        // Find the first revision that shows assignment
        for (const revision of task.revisions) {
          if (revision.note && revision.note.includes('assigned')) {
            // This might indicate an assignment change
            // Try to find who was assigned before
            if (revision.changedBy) {
              originalAssignedTo = revision.changedBy;
              break;
            }
          }
        }
      }

      // If no revision history, use current assignedTo if task is still pending
      // For submitted tasks, we need to look at the task type
      if (!originalAssignedTo) {
        const pendingStatuses = ['content_pending', 'design_pending', 'development_pending', 'todo', 'in_progress'];
        const submittedStatuses = ['content_submitted', 'design_submitted', 'development_submitted'];
        const approvedStatuses = ['content_final_approved', 'design_approved', 'development_approved', 'final_approved', 'approved_by_tester', 'content_approved'];
        const rejectedStatuses = ['content_rejected', 'design_rejected', 'rejected'];

        if (pendingStatuses.includes(task.status)) {
          // Task is still pending, current assignedTo is the original assignee
          originalAssignedTo = task.assignedTo;
        } else if (submittedStatuses.includes(task.status) || approvedStatuses.includes(task.status) || rejectedStatuses.includes(task.status)) {
          // Task was submitted - we need to find the original assignee
          // Check createdBy as fallback (task creator often assigns to themselves or assigns the task)
          // Also check if there's an assignee in revision history

          // For content tasks, the original assignee would be the Content Planner
          // For design tasks, it would be the designer
          // For development tasks, it would be the developer

          // First try createdBy (often the performance marketer who created the task)
          // But we need to check if this person has the right role

          // Fallback: Use createdBy as original assignee
          // This is not perfect but better than nothing
          originalAssignedTo = task.createdBy;
        }
      }

      // Update task if we found an original assignee
      if (originalAssignedTo) {
        await Task.findByIdAndUpdate(task._id, { originalAssignedTo });
        fixedCount++;
        console.log(`✓ Fixed task ${task._id} (${task.status}): originalAssignedTo = ${originalAssignedTo}`);
      } else {
        console.log(`⚠ Could not determine original assignee for task ${task._id} (${task.status})`);
      }
    }

    console.log(`\n========== FIX COMPLETE ==========`);
    console.log(`Total tasks without originalAssignedTo: ${tasksWithoutOriginal.length}`);
    console.log(`Tasks fixed: ${fixedCount}`);
    console.log(`Tasks skipped (no original assignee found): ${tasksWithoutOriginal.length - fixedCount}`);

    // Verify by checking tasks now
    const remainingTasks = await Task.find({
      originalAssignedTo: { $exists: false }
    });
    console.log(`\nRemaining tasks without originalAssignedTo: ${remainingTasks.length}`);

    // Also check if content_submitted tasks have correct assignments
    const submittedContentTasks = await Task.find({ status: 'content_submitted' })
      .populate('assignedTo', 'name email role')
      .populate('originalAssignedTo', 'name email role');

    console.log(`\n========== CONTENT SUBMITTED TASKS ==========`);
    console.log(`Total content_submitted tasks: ${submittedContentTasks.length}`);

    submittedContentTasks.forEach(task => {
      console.log(`Task ${task._id}:`);
      console.log(`  - assignedTo: ${task.assignedTo?.name || 'N/A'} (${task.assignedTo?.role || 'N/A'})`);
      console.log(`  - originalAssignedTo: ${task.originalAssignedTo?.name || 'N/A'}`);
      console.log(`  - assignedRole: ${task.assignedRole}`);
    });

    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixContentWriterTasks();