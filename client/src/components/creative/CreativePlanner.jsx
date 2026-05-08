import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Textarea, Badge } from '@/components/ui';
import {
  Image, Video, Layout, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, FileImage,
  Target, Type, Monitor, Users, FileText, Megaphone, TrendingUp, Zap, Eye, MousePointer,
  UserPlus, Send, DollarSign, Sparkles, CheckSquare, AlertTriangle, Check
} from 'lucide-react';
import {
  CREATIVE_TYPES,
  CREATIVE_SUBTYPES,
  CAMPAIGN_OBJECTIVES,
  CREATIVE_ROLES,
  getSubTypesForCreativeType,
  getRoleLabel
} from '@/constants/creativeTypes';
import { frameworkCategoryService, creativeService } from '@/services/api';

// Icon mapping for creative types
const CREATIVE_TYPE_ICONS = {
  IMAGE: Image,
  VIDEO: Video,
  CAROUSEL: Layout
};

// Icon mapping for ad types (objectives)
const OBJECTIVE_ICONS = {
  awareness: Eye,
  nurturing: TrendingUp,
  traffic: MousePointer,
  retargeting: Target,
  engagement: Zap,
  lead_generation: UserPlus,
  conversion: Send,
  app_install: Monitor,
  sales: DollarSign,
  brand_consideration: Megaphone
};

// Objective colors
const OBJECTIVE_COLORS = {
  awareness: 'bg-blue-100 text-blue-700 border-blue-200',
  nurturing: 'bg-green-100 text-green-700 border-green-200',
  traffic: 'bg-purple-100 text-purple-700 border-purple-200',
  retargeting: 'bg-orange-100 text-orange-700 border-orange-200',
  engagement: 'bg-pink-100 text-pink-700 border-pink-200',
  lead_generation: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  conversion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  app_install: 'bg-violet-100 text-violet-700 border-violet-200',
  sales: 'bg-amber-100 text-amber-700 border-amber-200',
  brand_consideration: 'bg-indigo-100 text-indigo-700 border-indigo-200'
};

// Screen sizes (flat list without platform dependency)
const FLAT_SCREEN_SIZES = [
  { key: 'square', label: 'Square (1:1)', dimensions: '1080x1080' },
  { key: 'portrait', label: 'Portrait (4:5)', dimensions: '1080x1350' },
  { key: 'three_four', label: '3:4', dimensions: '1080x1440' },
  { key: 'story', label: 'Story (9:16)', dimensions: '1080x1920' },
  { key: 'reel', label: 'Reel (9:16)', dimensions: '1080x1920' },
  { key: 'shorts', label: 'Shorts (9:16)', dimensions: '1080x1920' },
  { key: 'video', label: 'Video (16:9)', dimensions: '1920x1080' },
  { key: 'thumbnail', label: 'Thumbnail', dimensions: '1280x720' }
];

// Generate unique ID for NEW creative rows (prefix makes them distinguishable from DB IDs)
const generateId = () => `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Check if an _id is a locally-generated temporary ID (not yet persisted to DB)
const isTemporaryId = (id) => typeof id === 'string' && id.startsWith('creative_');

// Default creative row
const createEmptyCreative = () => ({
  _id: generateId(),
  name: '',
  adType: '',
  creativeType: 'IMAGE',
  subType: '',
  screenSizes: [],
  assignedRole: '',
  assignedTeamMembers: [],
  contentWriters: [],
  assignedTesters: [],
  adIntent: '',
  aiFramework: '',
  aiSubCategory: '',
  notes: ''
});

// Framework options for content planner
const FRAMEWORK_OPTIONS = [
  { value: 'PAS', label: 'PAS - Problem-Agitate-Solution', description: 'Identify problem, amplify pain, present solution' },
  { value: 'AIDA', label: 'AIDA - Attention-Interest-Desire-Action', description: 'Classic marketing framework for conversions' },
  { value: 'BAB', label: 'BAB - Before-After-Bridge', description: 'Show transformation from pain to pleasure' },
  { value: '4C', label: '4C - Clear-Concise-Compelling-Credible', description: 'Clear communication framework' },
  { value: 'STORY', label: 'STORY - Storytelling Framework', description: 'Hook-Relate-Educate-Stimulate-Transition' },
  { value: 'DIRECT_RESPONSE', label: 'Direct Response', description: 'Headline-Offer-CTA focused copy' },
  { value: 'HOOKS', label: 'Hook Generator', description: 'Generate multiple scroll-stopping hooks' },
  { value: 'OBJECTION', label: 'Objection Handling', description: 'Acknowledge-Isolate-Reframe-Prove-Overcome' },
  { value: 'PASTOR', label: 'PASTOR - Problem-Amplify-Story-Testimony-Offer-Response', description: 'Complete persuasion framework' },
  { value: 'QUEST', label: 'QUEST - Qualify-Understand-Educate-Stimulate-Transition', description: 'Nurturing content framework' },
  { value: 'ACCA', label: 'ACCA - Awareness-Comparison-Consideration-Action', description: 'Consideration stage framework' },
  { value: 'FAB', label: 'FAB - Features-Advantages-Benefits', description: 'Transform features into emotional benefits' },
  { value: '5A', label: '5A - Aware-Appeal-Ask-Act-Assess', description: 'Engagement-focused framework' },
  { value: 'SLAP', label: 'SLAP - Stop-Look-Act-Purchase', description: 'Quick-conversion framework' },
  { value: 'HOOK_STORY_OFFER', label: 'Hook-Story-Offer', description: 'Social media content formula' },
  { value: '4P', label: '4P - Picture-Promise-Prove-Push', description: 'Persuasive copy framework' },
  { value: 'MASTER', label: 'MASTER - Multi-Framework', description: 'Intelligent combination of frameworks' },
];

// Map role keys to project assignedTeam fields
const ROLE_TO_TEAM_FIELD = {
  'content_writer': { arrayField: 'contentWriters', legacyField: 'contentWriter' },
  'graphic_designer': { arrayField: 'graphicDesigners', legacyField: 'graphicDesigner' },
  'video_editor': { arrayField: 'videoEditors', legacyField: 'videoEditor' },
  'tester': { arrayField: 'testers', legacyField: 'tester' }
};

// LocalStorage key for auto-saving creative strategy data
const getStorageKey = (projectId) => `creative_strategy_draft_${projectId}`;

export default function CreativePlanner({
  projectId,
  initialData,
  onSave,
  isCompleted,
  project,
  readOnly = false
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectAssignedTeam, setProjectAssignedTeam] = useState({});
  const [creativePlan, setCreativePlan] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [lastAutoSaved, setLastAutoSaved] = useState(null);

  // ─── FIX: Use ref to track saving state for immediate synchronous check
  // This prevents multiple clicks before React state updates
  const isSavingRef = useRef(false);

  // ─── FIX: Track the "last saved snapshot" so we can diff on save
  // and know which assignments are NEW (need task creation) vs unchanged.
  const lastSavedPlanRef = useRef([]);

  // ─── AUTO-SAVE: Track if we've loaded server data to prevent draft overwriting
  const hasLoadedFromServer = useRef(false);

  // ─── AUTO-SAVE: Load draft from localStorage on mount if no server data
  useEffect(() => {
    // Only load draft if:
    // 1. We haven't already loaded from server
    // 2. Server doesn't have creative plan data
    // 3. Project exists
    const serverHasData = initialData?.creativePlan && initialData.creativePlan.length > 0;

    if (!hasLoadedFromServer.current && !serverHasData && projectId) {
      const storageKey = getStorageKey(projectId);
      try {
        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.creativePlan && parsed.creativePlan.length > 0) {
            console.log('Restoring creative strategy draft from localStorage');
            setCreativePlan(parsed.creativePlan);
            setAdditionalNotes(parsed.additionalNotes || '');

            // Expand all cards
            const expanded = {};
            parsed.creativePlan.forEach(item => {
              expanded[item._id] = true;
            });
            setExpandedCards(expanded);

            // Update the last saved ref
            lastSavedPlanRef.current = parsed.creativePlan.map(r => ({
              _id: r._id,
              assignedTeamMembers: [...(r.assignedTeamMembers || [])],
              contentWriter: r.contentWriter || '',
              assignedRole: r.assignedRole || '',
              assignedTesters: [...(r.assignedTesters || [])]
            }));
          }
        }
      } catch (error) {
        console.error('Error loading draft from localStorage:', error);
      }
    }
  }, [projectId, initialData, isCompleted]);

  // ─── AUTO-SAVE: Save draft to localStorage whenever form data changes
  useEffect(() => {
    if (projectId && !readOnly && creativePlan.length > 0) {
      const storageKey = getStorageKey(projectId);
      try {
        const draft = {
          creativePlan,
          additionalNotes,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setLastAutoSaved(new Date());
      } catch (error) {
        console.error('Error saving draft to localStorage:', error);
      }
    }
  }, [creativePlan, additionalNotes, projectId, readOnly]);

  // ─── AUTO-SAVE: Clear draft from localStorage when form is completed
  const clearDraft = () => {
    if (projectId) {
      const storageKey = getStorageKey(projectId);
      localStorage.removeItem(storageKey);
      console.log('Cleared creative strategy draft from localStorage');
    }
  };

  // Fetch all subcategories on mount
  useEffect(() => {
    const fetchAllSubCategories = async () => {
      try {
        const response = await frameworkCategoryService.getCategories();
        setAllSubCategories(response.data || []);
      } catch (error) {
        console.error('Failed to fetch subcategories:', error);
      }
    };
    fetchAllSubCategories();
  }, []);

  // Extract project assigned team from project prop
  useEffect(() => {
    if (project?.assignedTeam) {
      setProjectAssignedTeam(project.assignedTeam);
    } else {
      setProjectAssignedTeam({});
    }
  }, [project]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      // Mark that we've received server data
      hasLoadedFromServer.current = true;

      // Only clear draft if server has actual data
      if (initialData.creativePlan && initialData.creativePlan.length > 0) {
        // Server has data - clear any draft and load from server
        clearDraft();

        const migratedPlan = initialData.creativePlan.map(item => {
          // ─── FIX: Extract IDs from populated objects
          // assignedTeamMembers can be either ObjectId strings or populated user objects
          let teamMembers = item.assignedTeamMembers || [];
          if (teamMembers.length > 0 && typeof teamMembers[0] === 'object') {
            // Populated objects - extract _id from each
            teamMembers = teamMembers.map(m => m._id?.toString?.() || m._id || String(m));
          } else {
            // Already strings - ensure they're strings
            teamMembers = teamMembers.map(m => typeof m === 'string' ? m : m._id?.toString?.() || String(m));
          }

          // contentWriters can be either ObjectId strings or populated user objects (array field)
          let contentWritersIds = item.contentWriters || [];
          if (contentWritersIds.length > 0 && typeof contentWritersIds[0] === 'object') {
            // Populated objects - extract _id from each
            contentWritersIds = contentWritersIds.map(w => w._id?.toString?.() || w._id || String(w));
          } else {
            // Already strings - ensure they're strings
            contentWritersIds = contentWritersIds.map(w => typeof w === 'string' ? w : w._id?.toString?.() || String(w));
          }

          // Fallback: Legacy contentWriter (single) field - convert to array
          if (contentWritersIds.length === 0 && item.contentWriter) {
            let legacyWriterId = item.contentWriter;
            if (typeof legacyWriterId === 'object') {
              legacyWriterId = legacyWriterId._id?.toString?.() || legacyWriterId._id || String(legacyWriterId);
            } else {
              legacyWriterId = legacyWriterId.toString();
            }
            contentWritersIds = [legacyWriterId];
          }

          // assignedTesters can be either ObjectId strings or populated user objects
          let assignedTestersIds = item.assignedTesters || [];
          if (assignedTestersIds.length > 0 && typeof assignedTestersIds[0] === 'object') {
            // Populated objects - extract _id from each
            assignedTestersIds = assignedTestersIds.map(t => t._id?.toString?.() || t._id || String(t));
          } else {
            // Already strings - ensure they're strings
            assignedTestersIds = assignedTestersIds.map(t => typeof t === 'string' ? t : t._id?.toString?.() || String(t));
          }

          return {
            // ─── FIX: Preserve the real MongoDB _id as-is; only fall back to
            // a generated temp ID if there is genuinely no _id on the item.
            _id: item._id || generateId(),
            name: item.name || '',
            adType: item.objective || item.adType || '',
            creativeType: item.creativeType || 'IMAGE',
            subType: item.subType || item.adType || '',
            screenSizes: item.screenSizes || [],
            assignedRole: item.assignedRole || '',
            assignedTeamMembers: teamMembers,
            contentWriters: contentWritersIds,
            assignedTesters: assignedTestersIds,
            adIntent: item.adIntent || '',
            aiFramework: item.aiFramework || item.framework || '',
            aiSubCategory: item.aiSubCategory || item.subCategory || '',
            notes: item.notes || ''
          };
        });
        setCreativePlan(migratedPlan);

        // ─── FIX: Snapshot the freshly-loaded plan so handleSave can diff
        // against it to detect NEW assignments after an edit.
        lastSavedPlanRef.current = migratedPlan.map(r => ({
          _id: r._id,
          assignedTeamMembers: [...(r.assignedTeamMembers || [])],
          contentWriters: [...(r.contentWriters || [])],
          assignedRole: r.assignedRole || '',
          assignedTesters: [...(r.assignedTesters || [])]
        }));

        const expanded = {};
        migratedPlan.forEach(item => {
          expanded[item._id] = true;
        });
        setExpandedCards(expanded);
      }
      // If server has no creative plan, keep the draft loaded from localStorage

      if (initialData.additionalNotes) {
        setAdditionalNotes(initialData.additionalNotes);
      }
    }
  }, [initialData]);

  // Toggle card expansion
  const toggleCard = (rowId) => {
    setExpandedCards(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  // Add new creative row
  const addCreativeRow = () => {
    const newId = generateId();
    setCreativePlan(prev => [...prev, { ...createEmptyCreative(), _id: newId }]);
    setExpandedCards(prev => ({ ...prev, [newId]: true }));
  };

  // Remove creative row
  const removeCreativeRow = async (rowId) => {
    // Check if this is an existing creative (has a real MongoDB ID, not a temp ID)
    const isExistingCreative = !isTemporaryId(rowId);

    if (isExistingCreative) {
      // For existing creatives, call the backend to delete and remove associated tasks
      try {
        setDeleting(true);
        const response = await creativeService.deleteCreativePlanItem(projectId, rowId);
        const { deletedItem, deletedTasksCount } = response.data || {};

        // Remove from local state
        setCreativePlan(prev => prev.filter(row => row._id !== rowId));
        setExpandedCards(prev => {
          const newExpanded = { ...prev };
          delete newExpanded[rowId];
          return newExpanded;
        });

        // Show success message with task deletion info
        if (deletedTasksCount > 0) {
          toast.success(`Creative "${deletedItem?.name || 'Unnamed'}" deleted. ${deletedTasksCount} associated task(s) removed.`);
        } else {
          toast.success(`Creative "${deletedItem?.name || 'Unnamed'}" deleted successfully.`);
        }
      } catch (error) {
        console.error('Error deleting creative:', error);
        toast.error(error?.response?.data?.message || 'Failed to delete creative');
      } finally {
        setDeleting(false);
      }
    } else {
      // For new creatives (temp ID), just remove from local state
      setCreativePlan(prev => prev.filter(row => row._id !== rowId));
      setExpandedCards(prev => {
        const newExpanded = { ...prev };
        delete newExpanded[rowId];
        return newExpanded;
      });
    }
  };

  // Update creative row field
  const updateCreativeRow = (rowId, field, value) => {
    setCreativePlan(prev =>
      prev.map(row => {
        if (row._id !== rowId) return row;

        const updatedRow = { ...row, [field]: value };

        // Reset sub-type when creative type changes
        if (field === 'creativeType') {
          updatedRow.subType = '';
        }

        // When role changes, clear the team member selection
        if (field === 'assignedRole') {
          updatedRow.assignedTeamMembers = [];
        }

        // Reset aiSubCategory when aiFramework changes
        if (field === 'aiFramework') {
          updatedRow.aiSubCategory = '';
        }

        return updatedRow;
      })
    );
  };

  // Get subcategories for a specific framework
  const getSubCategoriesForFramework = (frameworkType) => {
    if (!frameworkType) return [];
    return allSubCategories.filter(c => c.frameworkType === frameworkType);
  };

  // Handle screen size toggle
  const toggleScreenSize = (rowId, sizeKey) => {
    setCreativePlan(prev =>
      prev.map(row => {
        if (row._id !== rowId) return row;
        const currentSizes = row.screenSizes || [];
        const newSizes = currentSizes.includes(sizeKey)
          ? currentSizes.filter(s => s !== sizeKey)
          : [...currentSizes, sizeKey];
        return { ...row, screenSizes: newSizes };
      })
    );
  };

  // Get the project-assigned team members for a role
  const getProjectAssignedMembers = (role) => {
    if (!role) return [];

    const fieldConfig = ROLE_TO_TEAM_FIELD[role];
    if (!fieldConfig) return [];

    if (!projectAssignedTeam || Object.keys(projectAssignedTeam).length === 0) {
      return [];
    }

    const assignedMembers = [];

    const arrayField = projectAssignedTeam[fieldConfig.arrayField];
    if (arrayField && Array.isArray(arrayField) && arrayField.length > 0) {
      arrayField.forEach(member => {
        if (member) {
          if (typeof member === 'object' && member !== null) {
            if (member._id || member.name) {
              assignedMembers.push({
                _id: member._id?.toString?.() || member._id || String(member),
                name: member.name || 'Unknown',
                isProjectAssigned: true
              });
            }
          } else if (typeof member === 'string') {
            assignedMembers.push({
              _id: member,
              name: 'Team Member',
              isProjectAssigned: true
            });
          }
        }
      });
    }

    if (assignedMembers.length === 0) {
      const legacyField = projectAssignedTeam[fieldConfig.legacyField];
      if (legacyField) {
        if (typeof legacyField === 'object' && legacyField !== null) {
          assignedMembers.push({
            _id: legacyField._id?.toString?.() || legacyField._id || String(legacyField),
            name: legacyField.name || 'Unknown',
            isProjectAssigned: true
          });
        } else if (typeof legacyField === 'string') {
          assignedMembers.push({
            _id: legacyField,
            name: 'Team Member',
            isProjectAssigned: true
          });
        }
      }
    }

    return assignedMembers;
  };

  // Get Content Planners from project assigned team
  const getContentWriters = () => {
    if (!projectAssignedTeam || Object.keys(projectAssignedTeam).length === 0) return [];

    const contentWriters = [];
    const arrayField = projectAssignedTeam.contentWriters;

    if (arrayField && Array.isArray(arrayField) && arrayField.length > 0) {
      arrayField.forEach(member => {
        if (member) {
          if (typeof member === 'object' && member !== null) {
            if (member._id || member.name) {
              contentWriters.push({
                _id: member._id?.toString?.() || member._id || String(member),
                name: member.name || 'Unknown'
              });
            }
          } else if (typeof member === 'string') {
            contentWriters.push({ _id: member, name: 'Team Member' });
          }
        }
      });
    }

    if (contentWriters.length === 0) {
      const legacyField = projectAssignedTeam.contentWriter;
      if (legacyField) {
        if (typeof legacyField === 'object' && legacyField !== null) {
          contentWriters.push({
            _id: legacyField._id?.toString?.() || legacyField._id || String(legacyField),
            name: legacyField.name || 'Unknown'
          });
        } else if (typeof legacyField === 'string') {
          contentWriters.push({ _id: legacyField, name: 'Team Member' });
        }
      }
    }

    return contentWriters;
  };

  const availableContentWriters = useMemo(() => getContentWriters(), [projectAssignedTeam]);

  // Get Testers from project assigned team
  const getTesters = () => {
    if (!projectAssignedTeam || Object.keys(projectAssignedTeam).length === 0) return [];

    const testers = [];
    const arrayField = projectAssignedTeam.testers;

    if (arrayField && Array.isArray(arrayField) && arrayField.length > 0) {
      arrayField.forEach(member => {
        if (member) {
          if (typeof member === 'object' && member !== null) {
            if (member._id || member.name) {
              testers.push({
                _id: member._id?.toString?.() || member._id || String(member),
                name: member.name || 'Unknown'
              });
            }
          } else if (typeof member === 'string') {
            testers.push({ _id: member, name: 'Team Member' });
          }
        }
      });
    }

    if (testers.length === 0) {
      const legacyField = projectAssignedTeam.tester;
      if (legacyField) {
        if (typeof legacyField === 'object' && legacyField !== null) {
          testers.push({
            _id: legacyField._id?.toString?.() || legacyField._id || String(legacyField),
            name: legacyField.name || 'Unknown'
          });
        } else if (typeof legacyField === 'string') {
          testers.push({ _id: legacyField, name: 'Team Member' });
        }
      }
    }

    return testers;
  };

  const availableTesters = useMemo(() => getTesters(), [projectAssignedTeam]);

  // Calculate totals
  const totalCreatives = creativePlan.length;
  const imageCount = creativePlan.filter(c => c.creativeType === 'IMAGE').length;
  const videoCount = creativePlan.filter(c => c.creativeType === 'VIDEO').length;
  const carouselCount = creativePlan.filter(c => c.creativeType === 'CAROUSEL').length;

  // ─── FIX: Diff current plan against last-saved snapshot to find
  // creatives whose assignments have changed (or are brand new rows).
  // Returns an array of { rowId, isNewRow, changedAssignments } descriptors
  // that the parent's onSave handler can use to trigger task creation.
  const buildAssignmentDiff = (currentPlan) => {
    const previousMap = new Map(
      lastSavedPlanRef.current.map(r => [String(r._id), r])
    );

    const diff = [];

    currentPlan.forEach(row => {
      const rowId = String(row._id);
      const isNewRow = isTemporaryId(row._id);
      const prev = previousMap.get(rowId);

      if (isNewRow) {
        // Brand-new creative — all assignments are "new"
        diff.push({
          rowId,
          isNewRow: true,
          assignedRole: row.assignedRole || '',
          newTeamMembers: [...(row.assignedTeamMembers || [])],
          newContentWriters: [...(row.contentWriters || [])]
        });
        return;
      }

      if (!prev) {
        // Row exists in DB but wasn't in the last snapshot (edge case) — treat as new
        diff.push({
          rowId,
          isNewRow: false,
          assignedRole: row.assignedRole || '',
          newTeamMembers: [...(row.assignedTeamMembers || [])],
          newContentWriters: [...(row.contentWriters || [])]
        });
        return;
      }

      // Compare team member assignments
      const prevMembers = new Set((prev.assignedTeamMembers || []).map(String));
      const currMembers = (row.assignedTeamMembers || []).map(String);
      const addedMembers = currMembers.filter(m => !prevMembers.has(m));

      // Compare content writers (array)
      const prevWriters = new Set((prev.contentWriters || []).map(String));
      const currWriters = (row.contentWriters || []).map(String);
      const addedWriters = currWriters.filter(w => !prevWriters.has(w));

      if (addedMembers.length > 0 || addedWriters.length > 0) {
        diff.push({
          rowId,
          isNewRow: false,
          assignedRole: row.assignedRole || '',
          newTeamMembers: addedMembers,
          newContentWriters: addedWriters
        });
      }
    });

    return diff;
  };

  // Handle save
  const handleSave = async (markComplete = false) => {
    // ─── FIX: Guard against concurrent saves using both ref and state
    // Ref provides immediate synchronous check, state provides UI feedback
    if (saving || isSavingRef.current) return;

    try {
      setSaving(true);
      isSavingRef.current = true;

      // Validate that each creative has all required fields including tester
      const invalidCreatives = creativePlan.filter(row =>
        !row.adType ||
        !row.creativeType ||
        !row.subType ||
        row.screenSizes.length === 0 ||
        !row.assignedRole ||
        row.assignedTeamMembers.length === 0
      );

      // Check for creatives missing tester assignment
      const creativesWithoutTester = creativePlan.filter(row =>
        !row.assignedTesters || row.assignedTesters.length === 0
      );

      if (markComplete && creativePlan.length === 0) {
        toast.error('Please add at least one creative');
        return;
      }

      if (markComplete && invalidCreatives.length > 0) {
        toast.error('Please fill all required fields for each creative');
        return;
      }

      if (markComplete && creativesWithoutTester.length > 0) {
        toast.error('Please select a Tester for each creative');
        return;
      }

      const validCreatives = creativePlan.filter(row =>
        row.adType &&
        row.creativeType &&
        row.subType &&
        row.screenSizes.length > 0 &&
        row.assignedRole &&
        row.assignedTeamMembers.length > 0
      );

      if (markComplete && validCreatives.length === 0) {
        toast.error('Please add at least one creative with all fields filled');
        return; // finally block resets saving
      }

      // ─── FIX: Build assignment diff BEFORE serialising, so we can pass
      // it to onSave and let the parent trigger task-creation for any
      // newly assigned or changed team members (including edits/additions).
      const assignmentDiff = buildAssignmentDiff(creativePlan);

      const data = {
        creativePlan: creativePlan.map((row, index) => ({
          creativeType: row.creativeType,
          subType: row.subType,
          objective: row.adType,
          screenSizes: row.screenSizes || [],
          assignedRole: row.assignedRole || '',
          assignedTeamMembers: row.assignedTeamMembers || [],
          contentWriters: row.contentWriters || [],
          assignedTesters: row.assignedTesters || [],
          adIntent: row.adIntent || '',
          aiFramework: row.aiFramework || '',
          aiSubCategory: row.aiSubCategory || '',
          notes: row.notes || '',
          name: row.name || `Creative ${index + 1}`,
          order: index,
          // ─── FIX (core): Preserve the real MongoDB _id on existing rows.
          //
          // BEFORE (broken):
          //   _id: row._id && !row._id.toString().startsWith('creative_') ? row._id : undefined
          //   ^ This sent `undefined` for real DB IDs because real IDs do NOT
          //     start with 'creative_', so the condition was ALWAYS false for
          //     persisted rows — stripping every existing _id on every save.
          //
          // AFTER (fixed):
          //   Send the real _id for persisted rows; omit it for new temp rows
          //   so the backend creates a fresh document instead of trying to
          //   upsert with a synthetic local ID.
          _id: isTemporaryId(row._id) ? undefined : row._id
        })),
        additionalNotes,
        isCompleted: markComplete,
        // ─── FIX: Pass the diff so the parent/backend can create tasks for
        // any newly assigned team members (covers the edit-and-add scenario).
        assignmentDiff
      };

      await onSave(data, markComplete);

      // ─── FIX: Update the snapshot AFTER a successful save so subsequent
      // edits in the same session are diffed against the fresh baseline.
      lastSavedPlanRef.current = creativePlan.map(r => ({
        // After save, new rows will have been assigned real IDs by the
        // backend and returned via initialData re-hydration. Until then
        // we track them by their temp ID so re-edits before refresh still
        // diff correctly.
        _id: r._id,
        assignedTeamMembers: [...(r.assignedTeamMembers || [])],
        contentWriters: [...(r.contentWriters || [])],
        assignedRole: r.assignedRole || '',
        assignedTesters: [...(r.assignedTesters || [])]
      }));

      // ─── AUTO-SAVE: Clear draft from localStorage when completed
      if (markComplete) {
        clearDraft();
      }

      toast.success(markComplete ? 'Creative strategy completed!' : 'Progress saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error?.message || 'Failed to save');
    } finally {
      // ─── FIX: Always reset saving flag, even if an error was thrown
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-semibold text-sm">
          2
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Creative Strategy</h2>
          <p className="text-sm text-gray-500">Define your creatives and assign team members from the project team</p>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Creative Strategy Completed!</h3>
            <p className="text-sm text-green-600">You can still make changes above. Click "Update Changes" to save any modifications.</p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {creativePlan.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-primary-600">{totalCreatives}</div>
            <div className="text-sm text-gray-500">Total Creatives</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{imageCount}</span>
            </div>
            <div className="text-sm text-gray-500">Image</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-500" />
              <span className="text-2xl font-bold text-purple-600">{videoCount}</span>
            </div>
            <div className="text-sm text-gray-500">Video</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{carouselCount}</span>
            </div>
            <div className="text-sm text-gray-500">Carousel</div>
          </div>
        </div>
      )}

      {/* Creative Cards */}
      <div className="space-y-4">
        {creativePlan.map((row, index) => {
          const subTypes = getSubTypesForCreativeType(row.creativeType);
          const isExpanded = expandedCards[row._id];

          return (
            <Card key={row._id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              {/* Card Header - Always Visible */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() => toggleCard(row._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 text-primary-600 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {row.name || `Creative ${index + 1}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {row.adType && (
                        <Badge className={`${OBJECTIVE_COLORS[row.adType] || 'bg-gray-100 text-gray-700'} text-xs`}>
                          {CAMPAIGN_OBJECTIVES.find(o => o.key === row.adType)?.label || row.adType}
                        </Badge>
                      )}
                      {row.creativeType && (
                        <Badge variant="secondary" className="text-xs">
                          {CREATIVE_TYPES.find(t => t.key === row.creativeType)?.label || row.creativeType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (deleting) return;
                        await removeCreativeRow(row._id);
                      }}
                      disabled={deleting}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete creative"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Card Body - Collapsible */}
              {isExpanded && (
                <CardBody className="p-4 space-y-4">
                  {/* Row 1: Creative Name & Ad Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        Creative Name
                      </label>
                      <input
                        type="text"
                        value={row.name || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'name', e.target.value)}
                        placeholder={`Creative ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Target className="w-4 h-4 text-gray-400" />
                        Ad Type
                      </label>
                      <select
                        value={row.adType || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'adType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      >
                        <option value="">Select ad type...</option>
                        {CAMPAIGN_OBJECTIVES.map(obj => (
                          <option key={obj.key} value={obj.key}>{obj.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Creative Type & Sub-Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Type className="w-4 h-4 text-gray-400" />
                        Creative Type
                      </label>
                      <select
                        value={row.creativeType}
                        onChange={(e) => updateCreativeRow(row._id, 'creativeType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      >
                        {CREATIVE_TYPES.map(type => (
                          <option key={type.key} value={type.key}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <FileImage className="w-4 h-4 text-gray-400" />
                        Sub Type
                      </label>
                      <select
                        value={row.subType || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'subType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      >
                        <option value="">Select sub-type...</option>
                        {subTypes.map(subType => (
                          <option key={subType} value={subType}>{subType}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Screen Sizes */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Monitor className="w-4 h-4 text-gray-400" />
                      Screen Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {FLAT_SCREEN_SIZES.map(size => {
                        const isSelected = (row.screenSizes || []).includes(size.key);
                        return (
                          <button
                            key={size.key}
                            onClick={() => !readOnly && toggleScreenSize(row._id, size.key)}
                            disabled={readOnly}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-primary-100 border-primary-300 text-primary-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-primary-50'
                            }`}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 4: Assigned Role & Team Members */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        Production Role
                      </label>
                      <select
                        value={row.assignedRole || ''}
                        onChange={(e) => updateCreativeRow(row._id, 'assignedRole', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={readOnly}
                      >
                        <option value="">Select role...</option>
                        {CREATIVE_ROLES.filter(role => role.key !== 'content_writer').map(role => (
                          <option key={role.key} value={role.key}>{role.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Who creates the visual creative</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <UserPlus className="w-4 h-4 text-gray-400" />
                        Team Member
                      </label>
                      {row.assignedRole ? (
                        <div className="space-y-2">
                          {getProjectAssignedMembers(row.assignedRole).length === 0 ? (
                            <p className="text-xs text-gray-500 italic">
                              No team members assigned for this role yet.
                            </p>
                          ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {getProjectAssignedMembers(row.assignedRole).map(member => {
                                const isSelected = (row.assignedTeamMembers || []).includes(member._id);
                                return (
                                  <button
                                    key={member._id}
                                    type="button"
                                    onClick={() => {
                                      const currentMembers = row.assignedTeamMembers || [];
                                      if (isSelected) {
                                        updateCreativeRow(row._id, 'assignedTeamMembers', currentMembers.filter(id => id !== member._id));
                                      } else {
                                        updateCreativeRow(row._id, 'assignedTeamMembers', [...currentMembers, member._id]);
                                      }
                                    }}
                                    disabled={readOnly}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                      isSelected
                                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-primary-25'
                                    } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                                      {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="truncate">{member.name}</span>
                                    {member.isProjectAssigned && (
                                      <span className="text-xs text-primary-500 flex-shrink-0">Project</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {(row.assignedTeamMembers || []).length > 0 && (
                            <p className="text-xs text-gray-500">{(row.assignedTeamMembers || []).length} member{(row.assignedTeamMembers || []).length !== 1 ? 's' : ''} selected</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Select a role first to see available team members
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 4.5: Content Planner */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <FileText className="w-4 h-4 text-gray-400" />
                      Content Planners
                    </label>
                    <div className="space-y-2">
                      {availableContentWriters.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          No Content Planners assigned to this project. Please contact admin.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {availableContentWriters.map(writer => {
                            const isSelected = (row.contentWriters || []).includes(writer._id);
                            return (
                              <button
                                key={writer._id}
                                type="button"
                                onClick={() => {
                                  const currentWriters = row.contentWriters || [];
                                  if (isSelected) {
                                    updateCreativeRow(row._id, 'contentWriters', currentWriters.filter(id => id !== writer._id));
                                  } else {
                                    updateCreativeRow(row._id, 'contentWriters', [...currentWriters, writer._id]);
                                  }
                                }}
                                disabled={readOnly}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                  isSelected
                                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-25'
                                } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="truncate">{writer.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {(row.contentWriters || []).length > 0 && (
                        <p className="text-xs text-gray-500">{(row.contentWriters || []).length} writer{(row.contentWriters || []).length !== 1 ? 's' : ''} selected</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 italic mt-2">
                      The Content Planner creates the copy/text for this creative. Select from writers assigned to the project.
                    </p>
                  </div>

                  {/* Row 4.55: Testers Selection */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <CheckSquare className="w-4 h-4 text-gray-400" />
                      Testers <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {availableTesters.length === 0 ? (
                        <p className="text-xs text-red-500 italic">
                          No Testers assigned to this project. Please contact admin.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {availableTesters.map(tester => {
                            const isSelected = (row.assignedTesters || []).includes(tester._id);
                            return (
                              <button
                                key={tester._id}
                                type="button"
                                onClick={() => {
                                  const currentTesters = row.assignedTesters || [];
                                  if (isSelected) {
                                    updateCreativeRow(row._id, 'assignedTesters', currentTesters.filter(id => id !== tester._id));
                                  } else {
                                    updateCreativeRow(row._id, 'assignedTesters', [...currentTesters, tester._id]);
                                  }
                                }}
                                disabled={readOnly}
                                className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                  isSelected
                                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-25'
                                } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="truncate">{tester.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {(row.assignedTesters || []).length > 0 && (
                        <p className="text-xs text-gray-500">{(row.assignedTesters || []).length} tester{(row.assignedTesters || []).length !== 1 ? 's' : ''} selected</p>
                      )}
                    </div>
                  </div>

                  {/* Row 4.6: Framework & Subcategory for Content Planner */}
                  {(row.contentWriters || []).length > 0 && (
                    <div className="grid grid-cols-2 gap-4 bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          AI Framework
                        </label>
                        <select
                          value={row.aiFramework || ''}
                          onChange={(e) => updateCreativeRow(row._id, 'aiFramework', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          disabled={readOnly}
                        >
                          <option value="">Select Framework...</option>
                          {FRAMEWORK_OPTIONS.map(fw => (
                            <option key={fw.value} value={fw.value}>{fw.label}</option>
                          ))}
                        </select>
                        {row.aiFramework && (
                          <p className="text-xs text-gray-500 mt-1">
                            {FRAMEWORK_OPTIONS.find(fw => fw.value === row.aiFramework)?.description}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subcategory <span className="text-gray-400">(Optional)</span>
                        </label>
                        <select
                          value={row.aiSubCategory || ''}
                          onChange={(e) => updateCreativeRow(row._id, 'aiSubCategory', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          disabled={!row.aiFramework || readOnly}
                        >
                          <option value="">No subcategory (framework-level)</option>
                          {getSubCategoriesForFramework(row.aiFramework).map(cat => (
                            <option key={cat._id} value={cat.key}>
                              {cat.displayName}{cat.isSystem ? ' (Default)' : ''}
                            </option>
                          ))}
                        </select>
                        {row.aiFramework && getSubCategoriesForFramework(row.aiFramework).length === 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            No subcategories available for this framework
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Row 5: Ad Intent */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      Ad Intent
                    </label>
                    <input
                      type="text"
                      value={row.adIntent || ''}
                      onChange={(e) => updateCreativeRow(row._id, 'adIntent', e.target.value)}
                      placeholder="e.g., UGC ads, testimonial ads, product demo..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      disabled={readOnly}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Define the type of ads (e.g., UGC ads, testimonial ads, product demo)
                    </p>
                  </div>

                  {/* Row 6: Notes */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <Textarea
                      value={row.notes || ''}
                      onChange={(e) => updateCreativeRow(row._id, 'notes', e.target.value)}
                      placeholder="Add any notes or instructions..."
                      rows={2}
                      disabled={readOnly}
                    />
                  </div>
                </CardBody>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Creative Button */}
      {!readOnly && (
        <Button
          variant="outline"
          onClick={addCreativeRow}
          className="w-full py-3 border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Creative
        </Button>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
        </CardHeader>
        <CardBody>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Add any additional notes or instructions for the creative strategy..."
            rows={4}
            disabled={readOnly}
          />
        </CardBody>
      </Card>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-4">
          {/* Auto-save indicator */}
          {lastAutoSaved && creativePlan.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Auto-saved {Math.floor((Date.now() - lastAutoSaved.getTime()) / 1000) < 60 ? 'just now' : `${Math.floor((Date.now() - lastAutoSaved.getTime()) / 60000)} min ago`}</span>
            </div>
          )}
          <div className="flex gap-4 ml-auto">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className={saving ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : isCompleted ? 'Update Changes' : 'Save Progress'}
            </Button>
            {!isCompleted && (
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
                className={saving ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Complete & Continue'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}