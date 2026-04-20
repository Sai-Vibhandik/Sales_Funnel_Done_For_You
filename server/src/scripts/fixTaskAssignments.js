/**
 * Script to fix tasks with incorrect testerId, marketerId, testerReviewedBy, or marketerApprovedBy assignments
 *
 * This script:
 * 1. Finds tasks where testerId doesn't belong to the task's organization
 * 2. Finds tasks where marketerId doesn't belong to the task's organization
 * 3. Finds tasks where testerReviewedBy doesn't belong to the task's organization
 * 4. Finds tasks where marketerApprovedBy doesn't belong to the task's organization
 * 5. Finds tasks with missing organizationId and fixes it from project
 * 6. Sets those fields to null if they're invalid
 * 7. Logs the changes made
 *
 * Run with: node -e "require('./src/scripts/fixTaskAssignments').run()"
 */

const mongoose = require('mongoose');
const Task = require('../models/Task');
const Membership = require('../models/Membership');
const Project = require('../models/Project');
require('dotenv').config();

async function fixTaskAssignments() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/growth-valley';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const results = {
      totalChecked: 0,
      invalidTesterId: 0,
      invalidMarketerId: 0,
      invalidTesterReviewedBy: 0,
      invalidMarketerApprovedBy: 0,
      missingOrganizationId: 0,
      fixed: []
    };

    // Get all tasks with any user assignment fields set
    const tasks = await Task.find({
      $or: [
        { testerId: { $ne: null } },
        { marketerId: { $ne: null } },
        { testerReviewedBy: { $ne: null } },
        { marketerApprovedBy: { $ne: null } }
      ]
    }).populate('projectId', 'organizationId');

    console.log(`Found ${tasks.length} tasks with user assignments to check`);
    results.totalChecked = tasks.length;

    for (const task of tasks) {
      let needsUpdate = false;
      const updates = {};

      // Get organization ID from task or project
      let organizationId = task.organizationId;
      if (!organizationId && task.projectId?.organizationId) {
        organizationId = task.projectId.organizationId;
        updates.organizationId = organizationId;
        results.missingOrganizationId++;
        needsUpdate = true;
      }

      if (!organizationId) {
        console.log(`Task ${task._id} has no organizationId and no project - skipping`);
        continue;
      }

      // Check if testerId belongs to the organization
      if (task.testerId) {
        const testerMembership = await Membership.findOne({
          userId: task.testerId,
          organizationId: organizationId,
          status: 'active'
        });

        if (!testerMembership) {
          console.log(`Task ${task._id}: testerId ${task.testerId} is invalid for organization ${organizationId} - clearing`);
          updates.testerId = null;
          results.invalidTesterId++;
          needsUpdate = true;
        }
      }

      // Check if marketerId belongs to the organization
      if (task.marketerId) {
        const marketerMembership = await Membership.findOne({
          userId: task.marketerId,
          organizationId: organizationId,
          status: 'active'
        });

        if (!marketerMembership) {
          console.log(`Task ${task._id}: marketerId ${task.marketerId} is invalid for organization ${organizationId} - clearing`);
          updates.marketerId = null;
          results.invalidMarketerId++;
          needsUpdate = true;
        }
      }

      // Check if testerReviewedBy belongs to the organization
      if (task.testerReviewedBy) {
        const reviewerMembership = await Membership.findOne({
          userId: task.testerReviewedBy,
          organizationId: organizationId,
          status: 'active'
        });

        if (!reviewerMembership) {
          console.log(`Task ${task._id}: testerReviewedBy ${task.testerReviewedBy} is invalid for organization ${organizationId} - clearing`);
          updates.testerReviewedBy = null;
          results.invalidTesterReviewedBy++;
          needsUpdate = true;
        }
      }

      // Check if marketerApprovedBy belongs to the organization
      if (task.marketerApprovedBy) {
        const approverMembership = await Membership.findOne({
          userId: task.marketerApprovedBy,
          organizationId: organizationId,
          status: 'active'
        });

        if (!approverMembership) {
          console.log(`Task ${task._id}: marketerApprovedBy ${task.marketerApprovedBy} is invalid for organization ${organizationId} - clearing`);
          updates.marketerApprovedBy = null;
          results.invalidMarketerApprovedBy++;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Task.updateOne({ _id: task._id }, { $set: updates });
        results.fixed.push({
          taskId: task._id,
          updates
        });
      }
    }

    console.log('\n=== RESULTS ===');
    console.log(`Total tasks checked: ${results.totalChecked}`);
    console.log(`Tasks with missing organizationId: ${results.missingOrganizationId}`);
    console.log(`Tasks with invalid testerId: ${results.invalidTesterId}`);
    console.log(`Tasks with invalid marketerId: ${results.invalidMarketerId}`);
    console.log(`Tasks with invalid testerReviewedBy: ${results.invalidTesterReviewedBy}`);
    console.log(`Tasks with invalid marketerApprovedBy: ${results.invalidMarketerApprovedBy}`);
    console.log(`Total tasks fixed: ${results.fixed.length}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

    return results;
  } catch (error) {
    console.error('Error fixing task assignments:', error);
    throw error;
  }
}

/**
 * Fix tester/marketer assignments from project's assigned team
 * This is an alternative approach - instead of clearing invalid assignments,
 * try to get the correct tester/marketer from the project's assigned team
 * Also handles testerReviewedBy and marketerApprovedBy fields
 */
async function fixFromProjectTeam() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/growth-valley';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const results = {
      totalChecked: 0,
      updated: 0,
      cleared: 0,
      invalidTesterReviewedBy: 0,
      invalidMarketerApprovedBy: 0
    };

    // Get all tasks
    const tasks = await Task.find({})
      .populate('projectId', 'organizationId assignedTeam');

    results.totalChecked = tasks.length;
    console.log(`Checking ${tasks.length} tasks`);

    for (const task of tasks) {
      if (!task.projectId) {
        console.log(`Task ${task._id} has no project - skipping`);
        continue;
      }

      const project = task.projectId;
      const orgId = task.organizationId || project.organizationId;

      if (!orgId) {
        console.log(`Task ${task._id} has no organization - skipping`);
        continue;
      }

      let needsUpdate = false;
      const updates = {};

      // Get valid testers from project team
      const projectTesters = project.assignedTeam?.testers || [];
      const legacyTester = project.assignedTeam?.tester;

      // Validate current testerId
      if (task.testerId) {
        const isValid = await Membership.exists({
          userId: task.testerId,
          organizationId: orgId,
          status: 'active'
        });

        if (!isValid) {
          // Try to find a valid tester from project team
          let validTester = null;
          for (const tester of projectTesters) {
            const testerId = tester._id || tester;
            const hasMembership = await Membership.exists({
              userId: testerId,
              organizationId: orgId,
              status: 'active'
            });
            if (hasMembership) {
              validTester = testerId;
              break;
            }
          }

          // Check legacy tester
          if (!validTester && legacyTester) {
            const legacyId = legacyTester._id || legacyTester;
            const hasMembership = await Membership.exists({
              userId: legacyId,
              organizationId: orgId,
              status: 'active'
            });
            if (hasMembership) {
              validTester = legacyId;
            }
          }

          if (validTester) {
            console.log(`Task ${task._id}: Updating testerId from ${task.testerId} to ${validTester}`);
            updates.testerId = validTester;
          } else {
            console.log(`Task ${task._id}: Clearing invalid testerId ${task.testerId} (no valid tester found)`);
            updates.testerId = null;
          }
          needsUpdate = true;
        }
      }

      // Validate current marketerId
      if (task.marketerId) {
        const isValid = await Membership.exists({
          userId: task.marketerId,
          organizationId: orgId,
          status: 'active'
        });

        if (!isValid) {
          // Try to find a valid marketer from project team
          const projectMarketers = project.assignedTeam?.performanceMarketers || [];
          const legacyMarketer = project.assignedTeam?.performanceMarketer;

          let validMarketer = null;
          for (const marketer of projectMarketers) {
            const marketerId = marketer._id || marketer;
            const hasMembership = await Membership.exists({
              userId: marketerId,
              organizationId: orgId,
              status: 'active'
            });
            if (hasMembership) {
              validMarketer = marketerId;
              break;
            }
          }

          if (!validMarketer && legacyMarketer) {
            const legacyId = legacyMarketer._id || legacyMarketer;
            const hasMembership = await Membership.exists({
              userId: legacyId,
              organizationId: orgId,
              status: 'active'
            });
            if (hasMembership) {
              validMarketer = legacyId;
            }
          }

          if (validMarketer) {
            console.log(`Task ${task._id}: Updating marketerId from ${task.marketerId} to ${validMarketer}`);
            updates.marketerId = validMarketer;
          } else {
            console.log(`Task ${task._id}: Clearing invalid marketerId ${task.marketerId} (no valid marketer found)`);
            updates.marketerId = null;
          }
          needsUpdate = true;
        }
      }

      // Validate testerReviewedBy - must belong to same organization
      if (task.testerReviewedBy) {
        const isValidReviewer = await Membership.exists({
          userId: task.testerReviewedBy,
          organizationId: orgId,
          status: 'active'
        });

        if (!isValidReviewer) {
          console.log(`Task ${task._id}: Clearing invalid testerReviewedBy ${task.testerReviewedBy} (user not in organization)`);
          updates.testerReviewedBy = null;
          results.invalidTesterReviewedBy++;
          needsUpdate = true;
        }
      }

      // Validate marketerApprovedBy - must belong to same organization
      if (task.marketerApprovedBy) {
        const isValidApprover = await Membership.exists({
          userId: task.marketerApprovedBy,
          organizationId: orgId,
          status: 'active'
        });

        if (!isValidApprover) {
          console.log(`Task ${task._id}: Clearing invalid marketerApprovedBy ${task.marketerApprovedBy} (user not in organization)`);
          updates.marketerApprovedBy = null;
          results.invalidMarketerApprovedBy++;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Task.updateOne({ _id: task._id }, { $set: updates });
        results.updated++;
      }
    }

    console.log('\n=== RESULTS ===');
    console.log(`Total tasks checked: ${results.totalChecked}`);
    console.log(`Tasks updated: ${results.updated}`);
    console.log(`Invalid testerReviewedBy cleared: ${results.invalidTesterReviewedBy}`);
    console.log(`Invalid marketerApprovedBy cleared: ${results.invalidMarketerApprovedBy}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

    return results;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Fix tasks with incorrect organizationId
 * This checks if task.organizationId matches project.organizationId
 * and fixes any discrepancies
 */
async function fixOrganizationIds() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/growth-valley';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const results = {
      totalChecked: 0,
      missingOrgId: 0,
      mismatchedOrgId: 0,
      fixed: []
    };

    // Get all tasks with populated project
    const tasks = await Task.find({})
      .populate('projectId', 'organizationId projectName businessName');

    results.totalChecked = tasks.length;
    console.log(`Checking ${tasks.length} tasks for organizationId issues`);

    for (const task of tasks) {
      if (!task.projectId) {
        console.log(`Task ${task._id} has no project - skipping`);
        continue;
      }

      const project = task.projectId;
      const projectOrgId = project.organizationId?.toString();
      const taskOrgId = task.organizationId?.toString();

      // Check if organizationId is missing
      if (!taskOrgId) {
        if (projectOrgId) {
          console.log(`Task ${task._id}: Missing organizationId - setting to ${projectOrgId} (from project "${project.projectName || project.businessName}")`);
          await Task.updateOne(
            { _id: task._id },
            { $set: { organizationId: projectOrgId } }
          );
          results.missingOrgId++;
          results.fixed.push({ taskId: task._id, issue: 'missing', fixedTo: projectOrgId });
        }
        continue;
      }

      // Check if organizationId doesn't match project's organization
      if (projectOrgId && taskOrgId !== projectOrgId) {
        console.log(`Task ${task._id}: organizationId mismatch - task has ${taskOrgId}, project has ${projectOrgId}`);
        console.log(`  Project: "${project.projectName || project.businessName}"`);
        await Task.updateOne(
          { _id: task._id },
          { $set: { organizationId: projectOrgId } }
        );
        results.mismatchedOrgId++;
        results.fixed.push({
          taskId: task._id,
          issue: 'mismatch',
          was: taskOrgId,
          fixedTo: projectOrgId
        });
      }
    }

    console.log('\n=== RESULTS ===');
    console.log(`Total tasks checked: ${results.totalChecked}`);
    console.log(`Tasks with missing organizationId: ${results.missingOrgId}`);
    console.log(`Tasks with mismatched organizationId: ${results.mismatchedOrgId}`);
    console.log(`Total tasks fixed: ${results.fixed.length}`);

    if (results.fixed.length > 0) {
      console.log('\nFixed tasks:');
      results.fixed.forEach(f => {
        if (f.issue === 'missing') {
          console.log(`  ${f.taskId}: Added organizationId -> ${f.fixedTo}`);
        } else {
          console.log(`  ${f.taskId}: ${f.was} -> ${f.fixedTo}`);
        }
      });
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

    return results;
  } catch (error) {
    console.error('Error fixing organization IDs:', error);
    throw error;
  }
}

/**
 * Run all fixes in sequence
 */
async function runAllFixes() {
  console.log('=== Running all fixes ===\n');

  console.log('1. Fixing organizationId values...\n');
  await fixOrganizationIds();

  console.log('\n2. Fixing task assignments...\n');
  await fixTaskAssignments();

  console.log('\n=== All fixes complete ===');
}

module.exports = {
  run: fixTaskAssignments,
  runFromProjectTeam: fixFromProjectTeam,
  fixOrganizationIds,
  runAllFixes
};

// If run directly
if (require.main === module) {
  fixTaskAssignments()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}