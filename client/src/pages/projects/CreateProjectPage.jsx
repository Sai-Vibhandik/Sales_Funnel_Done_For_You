// import { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { toast } from 'sonner';
// import { projectService, clientService } from '@/services/api';
// import { Card, CardBody, CardHeader, Button, Input } from '@/components/ui';
// import { ArrowLeft, Search, User, Building, Mail, Phone, X, Loader2, MapPin, ChevronDown } from 'lucide-react';

// const projectSchema = z.object({
//   projectName: z.string().min(2, 'Project name must be at least 2 characters').optional().or(z.literal('')),
//   customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
//   businessName: z.string().min(2, 'Business name must be at least 2 characters'),
//   mobile: z.string().min(10, 'Please enter a valid mobile number'),
//   email: z.string().email('Please enter a valid email'),
//   industry: z.string().optional().or(z.literal('')),
//   description: z.string().optional().or(z.literal('')),
//   budget: z.string().optional().or(z.literal('')),
//   timelineStartDate: z.string().optional().or(z.literal('')),
//   timelineEndDate: z.string().optional().or(z.literal('')),
//   'address.street': z.string().optional().or(z.literal('')),
//   'address.city': z.string().optional().or(z.literal('')),
//   'address.state': z.string().optional().or(z.literal('')),
//   'address.country': z.string().optional().or(z.literal('')),
//   'address.zipCode': z.string().optional().or(z.literal('')),
// });

// export default function CreateProjectPage() {
//   const [loading, setLoading] = useState(false);
//   const [clientSearch, setClientSearch] = useState('');
//   const [clients, setClients] = useState([]);
//   const [allClients, setAllClients] = useState([]); // Store all clients for dropdown
//   const [selectedClient, setSelectedClient] = useState(null);
//   const [searchLoading, setSearchLoading] = useState(false);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [initialLoadDone, setInitialLoadDone] = useState(false);
//   const searchRef = useRef(null);
//   const navigate = useNavigate();

//   const {
//     register,
//     handleSubmit,
//     setValue,
//     formState: { errors },
//   } = useForm({
//     resolver: zodResolver(projectSchema),
//     defaultValues: {
//       projectName: '',
//       customerName: '',
//       businessName: '',
//       mobile: '',
//       email: '',
//       industry: '',
//       description: '',
//       budget: '',
//       timelineStartDate: '',
//       timelineEndDate: '',
//       'address.street': '',
//       'address.city': '',
//       'address.state': '',
//       'address.country': '',
//       'address.zipCode': '',
//     },
//   });

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (searchRef.current && !searchRef.current.contains(event.target)) {
//         setShowDropdown(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Load all clients on mount for dropdown
//   useEffect(() => {
//     const loadAllClients = async () => {
//       try {
//         const response = await clientService.getClients();
//         setAllClients(response.data || []);
//         setInitialLoadDone(true);
//       } catch (error) {
//         console.error('Error loading clients:', error);
//         setInitialLoadDone(true);
//       }
//     };
//     loadAllClients();
//   }, []);

//   // Filter clients based on search or show all
//   useEffect(() => {
//     if (!showDropdown) return;

//     if (clientSearch.length < 2) {
//       // Show all clients when not searching
//       setClients(allClients);
//     } else {
//       // Filter clients locally
//       const searchLower = clientSearch.toLowerCase();
//       const filtered = allClients.filter(client =>
//         client.customerName?.toLowerCase().includes(searchLower) ||
//         client.businessName?.toLowerCase().includes(searchLower) ||
//         client.email?.toLowerCase().includes(searchLower)
//       );
//       setClients(filtered);
//     }
//   }, [clientSearch, allClients, showDropdown]);

//   // Handle input focus - show dropdown with all clients
//   const handleInputFocus = () => {
//     if (!selectedClient) {
//       setShowDropdown(true);
//       if (clientSearch.length < 2) {
//         setClients(allClients);
//       }
//     }
//   };

//   const handleSelectClient = (client) => {
//     setSelectedClient(client);
//     setClientSearch('');
//     setShowDropdown(false);

//     // Prefill form with client data
//     setValue('customerName', client.customerName || '');
//     setValue('businessName', client.businessName || '');
//     setValue('email', client.email || '');
//     setValue('mobile', client.mobile || '');
//     if (client.industry) setValue('industry', client.industry);
//     if (client.description) setValue('description', client.description);

//     // Prefill address
//     const addressData = client.address || {};
//     setValue('address.street', addressData.street || '');
//     setValue('address.city', addressData.city || '');
//     setValue('address.state', addressData.state || '');
//     setValue('address.country', addressData.country || '');
//     setValue('address.zipCode', addressData.zipCode || '');
//   };

//   const handleClearClient = () => {
//     setSelectedClient(null);
//     setValue('customerName', '');
//     setValue('businessName', '');
//     setValue('email', '');
//     setValue('mobile', '');
//     setValue('industry', '');
//     setValue('description', '');
//     setValue('address.street', '');
//     setValue('address.city', '');
//     setValue('address.state', '');
//     setValue('address.country', '');
//     setValue('address.zipCode', '');
//   };

//   const onSubmit = async (data) => {
//     try {
//       setLoading(true);

//       // Build address object - only include if there are values
//       const addressData = {
//         street: data['address.street']?.trim() || undefined,
//         city: data['address.city']?.trim() || undefined,
//         state: data['address.state']?.trim() || undefined,
//         country: data['address.country']?.trim() || undefined,
//         zipCode: data['address.zipCode']?.trim() || undefined,
//       };

//       // Check if any address field has a value
//       const hasAddress = Object.values(addressData).some(v => v !== undefined);

//       // Transform data for API
//       const projectData = {
//         customerName: data.customerName,
//         businessName: data.businessName,
//         mobile: data.mobile,
//         email: data.email,
//         projectName: data.projectName || undefined,
//         industry: data.industry || undefined,
//         description: data.description || undefined,
//         budget: data.budget ? Number(data.budget) : undefined,
//         timeline: (data.timelineStartDate || data.timelineEndDate) ? {
//           startDate: data.timelineStartDate ? new Date(data.timelineStartDate) : undefined,
//           endDate: data.timelineEndDate ? new Date(data.timelineEndDate) : undefined,
//         } : undefined,
//         // Only include address if there are values
//         ...(hasAddress ? { address: addressData } : {}),
//       };

//       // Add client reference if selected
//       if (selectedClient) {
//         projectData.client = selectedClient._id;
//         // If client is selected and no address was entered, use client's address
//         if (!hasAddress && selectedClient.address) {
//           const clientAddress = selectedClient.address;
//           if (clientAddress.street || clientAddress.city || clientAddress.state || clientAddress.country || clientAddress.zipCode) {
//             projectData.address = {
//               street: clientAddress.street || undefined,
//               city: clientAddress.city || undefined,
//               state: clientAddress.state || undefined,
//               country: clientAddress.country || undefined,
//               zipCode: clientAddress.zipCode || undefined,
//             };
//           }
//         }
//       }

//       const response = await projectService.createProject(projectData);
//       toast.success('Project created successfully!');
//       // Redirect to team assignment page
//       navigate(`/dashboard/projects/${response.data._id}/assign-team`);
//     } catch (error) {
//       toast.error(error.message || 'Failed to create project');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="max-w-3xl mx-auto space-y-6">
//       {/* Header */}
//       <div className="flex items-center gap-4">
//         <Button
//           variant="ghost"
//           onClick={() => navigate('/dashboard/projects')}
//           className="p-2"
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </Button>
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
//           <p className="text-gray-600 mt-1">
//             Start a new client project and begin the onboarding process.
//           </p>
//         </div>
//       </div>

//       {/* Client Selection */}
//       <Card>
//         <CardHeader>
//           <h2 className="text-lg font-semibold text-gray-900">Select Client</h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Search and select an existing client to auto-fill their details.
//           </p>
//         </CardHeader>
//         <CardBody className="pt-2">
//           {selectedClient ? (
//             <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
//               <div className="flex items-start justify-between">
//                 <div className="flex items-start gap-3">
//                   <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
//                     <Building className="w-5 h-5 text-primary-600" />
//                   </div>
//                   <div>
//                     <h3 className="font-semibold text-gray-900">{selectedClient.customerName}</h3>
//                     <p className="text-sm text-gray-600">{selectedClient.businessName}</p>
//                     <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
//                       <span className="flex items-center gap-1">
//                         <Mail className="w-3.5 h-3.5" />
//                         {selectedClient.email}
//                       </span>
//                       <span className="flex items-center gap-1">
//                         <Phone className="w-3.5 h-3.5" />
//                         {selectedClient.mobile}
//                       </span>
//                     </div>
//                     {(() => {
//                       const addr = selectedClient.address || {};
//                       const addressParts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean);
//                       if (addressParts.length > 0) {
//                         return (
//                           <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
//                             <MapPin className="w-3.5 h-3.5" />
//                             <span>{addressParts.join(', ')}</span>
//                           </div>
//                         );
//                       }
//                       return null;
//                     })()}
//                   </div>
//                 </div>
//                 <button
//                   onClick={handleClearClient}
//                   className="text-gray-400 hover:text-gray-600 p-1"
//                 >
//                   <X className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <div className="relative" ref={searchRef}>
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search or select client..."
//                 value={clientSearch}
//                 onChange={(e) => setClientSearch(e.target.value)}
//                 onFocus={handleInputFocus}
//                 className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
//               />
//               <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
//                 {!initialLoadDone && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
//                 <ChevronDown className="w-4 h-4 text-gray-400" />
//               </div>

//               {/* Dropdown with all clients or filtered results */}
//               {showDropdown && (
//                 <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
//                   {clients.length > 0 ? (
//                     clients.map((client) => {
//                       const clientAddress = client.address || {};
//                       const hasAddress = clientAddress.city || clientAddress.state || clientAddress.country;
//                       return (
//                         <button
//                           key={client._id}
//                           type="button"
//                           onClick={() => handleSelectClient(client)}
//                           className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
//                         >
//                           <div className="flex items-center gap-3">
//                             <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
//                               <User className="w-4 h-4 text-gray-500" />
//                             </div>
//                             <div className="flex-1 min-w-0">
//                               <p className="font-medium text-gray-900">{client.customerName}</p>
//                               <p className="text-sm text-gray-500 truncate">{client.businessName} • {client.email}</p>
//                               {hasAddress && (
//                                 <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
//                                   <MapPin className="w-3 h-3" />
//                                   {[clientAddress.city, clientAddress.state, clientAddress.country].filter(Boolean).join(', ')}
//                                 </p>
//                               )}
//                             </div>
//                           </div>
//                         </button>
//                       );
//                     })
//                   ) : (
//                     <div className="p-4 text-center text-gray-500">
//                       {clientSearch.length >= 2 ? 'No clients found.' : 'No clients available.'}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}
//         </CardBody>
//       </Card>

//       {/* Form */}
//       <Card>
//         <CardHeader>
//           <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Fill in the project and customer details below.
//           </p>
//         </CardHeader>
//         <CardBody>
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//             {/* Project Information */}
//             <div>
//               <h3 className="text-sm font-medium text-gray-700 mb-3">Project Information</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <Input
//                   label="Project Name"
//                   placeholder="TechStart Landing Page"
//                   error={errors.projectName?.message}
//                   {...register('projectName')}
//                 />
//                 <Input
//                   label="Industry"
//                   placeholder="Technology, E-commerce, etc."
//                   error={errors.industry?.message}
//                   {...register('industry')}
//                 />
//               </div>
//               <div className="mt-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Description
//                 </label>
//                 <textarea
//                   placeholder="Brief description of the project..."
//                   className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px]"
//                   {...register('description')}
//                 />
//               </div>
//             </div>

//             {/* Customer Information */}
//             <div>
//               <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <Input
//                   label="Customer Name *"
//                   placeholder="John Doe"
//                   error={errors.customerName?.message}
//                   {...register('customerName')}
//                 />
//                 <Input
//                   label="Business Name *"
//                   placeholder="Acme Corporation"
//                   error={errors.businessName?.message}
//                   {...register('businessName')}
//                 />
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//                 <Input
//                   label="Mobile Number *"
//                   placeholder="+1 234 567 890"
//                   error={errors.mobile?.message}
//                   {...register('mobile')}
//                 />
//                 <Input
//                   label="Email Address *"
//                   type="email"
//                   placeholder="john@example.com"
//                   error={errors.email?.message}
//                   {...register('email')}
//                 />
//               </div>

//               {/* Address Fields */}
//               <div className="mt-4">
//                 <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
//                   <MapPin className="w-4 h-4" />
//                   Address
//                 </h4>
//                 <Input
//                   label="Street Address"
//                   placeholder="123 Main Street"
//                   error={errors['address.street']?.message}
//                   {...register('address.street')}
//                 />
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//                   <Input
//                     label="City"
//                     placeholder="New York"
//                     error={errors['address.city']?.message}
//                     {...register('address.city')}
//                   />
//                   <Input
//                     label="State/Province"
//                     placeholder="NY"
//                     error={errors['address.state']?.message}
//                     {...register('address.state')}
//                   />
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//                   <Input
//                     label="Country"
//                     placeholder="United States"
//                     error={errors['address.country']?.message}
//                     {...register('address.country')}
//                   />
//                   <Input
//                     label="Zip/Postal Code"
//                     placeholder="10001"
//                     error={errors['address.zipCode']?.message}
//                     {...register('address.zipCode')}
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Budget & Timeline */}
//             <div>
//               <h3 className="text-sm font-medium text-gray-700 mb-3">Budget & Timeline</h3>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <Input
//                   label="Budget ($)"
//                   type="number"
//                   min={0}
//                   placeholder="5000"
//                   error={errors.budget?.message}
//                   {...register('budget')}
//                 />
//                 <Input
//                   label="Start Date"
//                   type="date"
//                   error={errors.timelineStartDate?.message}
//                   {...register('timelineStartDate')}
//                 />
//                 <Input
//                   label="End Date"
//                   type="date"
//                   error={errors.timelineEndDate?.message}
//                   {...register('timelineEndDate')}
//                 />
//               </div>
//             </div>

//             <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
//               <Button
//                 type="button"
//                 variant="secondary"
//                 onClick={() => navigate('/dashboard/projects')}
//               >
//                 Cancel
//               </Button>
//               <Button type="submit" loading={loading}>
//                 Create Project
//               </Button>
//             </div>
//           </form>
//         </CardBody>
//       </Card>
//     </div>
//   );
// }
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { projectService, clientService } from '@/services/api';
import { Card, CardBody, CardHeader, Button, Input } from '@/components/ui';
import { ArrowLeft, Search, User, Building, Mail, Phone, X, Loader2, MapPin, ChevronDown } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a yyyy-mm-dd string into a Date (midnight UTC) */
const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

/** Return the number of calendar days between two Date objects */
const daysBetween = (a, b) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

// ─── Schema ──────────────────────────────────────────────────────────────────

const projectSchema = z
  .object({
    // ── Project ──────────────────────────────────────────────────────────────
    projectName: z
      .string()
      .trim()
      .refine((v) => v === '' || v.length >= 2, {
        message: 'Project name must be at least 2 characters',
      })
      .optional()
      .or(z.literal('')),

    industry: z.string().optional().or(z.literal('')),

    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or fewer')
      .optional()
      .or(z.literal('')),

    // ── Customer (required) ───────────────────────────────────────────────────
    customerName: z
      .string()
      .trim()
      .min(1, 'Customer name is required')
      .min(2, 'Customer name must be at least 2 characters')
      .max(100, 'Customer name must be 100 characters or fewer'),

    businessName: z
      .string()
      .trim()
      .min(1, 'Business name is required')
      .min(2, 'Business name must be at least 2 characters')
      .max(150, 'Business name must be 150 characters or fewer'),

    mobile: z
      .string()
      .trim()
      .min(1, 'Mobile number is required')
      .regex(
        /^\d{10,13}$/,
        'Mobile number must be 10 to 13 digits (numbers only)'
      ),

    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .email('Enter a valid email address'),

    // ── Address (optional) ────────────────────────────────────────────────────
    'address.street': z
      .string()
      .max(200, 'Street address must be 200 characters or fewer')
      .optional()
      .or(z.literal('')),

    'address.city': z
      .string()
      .max(100, 'City must be 100 characters or fewer')
      .optional()
      .or(z.literal('')),

    'address.state': z
      .string()
      .max(100, 'State must be 100 characters or fewer')
      .optional()
      .or(z.literal('')),

    'address.country': z
      .string()
      .max(100, 'Country must be 100 characters or fewer')
      .optional()
      .or(z.literal('')),

    'address.zipCode': z
      .string()
      .regex(/^[A-Za-z0-9\s\-]{0,20}$/, 'Enter a valid zip/postal code')
      .optional()
      .or(z.literal('')),

    // ── Budget & Timeline ─────────────────────────────────────────────────────
    budget: z
      .string()
      .min(1, 'Budget is required')
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
        message: 'Budget must be a positive number',
      }),

    timelineStartDate: z.string().min(1, 'Start date is required'),
    timelineEndDate: z.string().min(1, 'End date is required'),
  })
  // ── Cross-field: date validation ──────────────────────────────────────────
  .superRefine((data, ctx) => {
    const start = parseDate(data.timelineStartDate);
    const end = parseDate(data.timelineEndDate);

    // Both dates present → validate end date is after start date
    if (start && end) {
      const diff = daysBetween(start, end);

      if (diff < 0) {
        ctx.addIssue({
          path: ['timelineEndDate'],
          code: z.ZodIssueCode.custom,
          message: 'End date must be after the start date',
        });
      }
    }
  });

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateProjectPage() {
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectName: '',
      customerName: '',
      businessName: '',
      mobile: '',
      email: '',
      industry: '',
      description: '',
      budget: '',
      timelineStartDate: '',
      timelineEndDate: '',
      'address.street': '',
      'address.city': '',
      'address.state': '',
      'address.country': '',
      'address.zipCode': '',
    },
  });

  // Derive the minimum allowed end date (start + 2 days)
  const watchedStartDate = watch('timelineStartDate');
  const minEndDate = (() => {
    if (!watchedStartDate) return '';
    const d = new Date(watchedStartDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  })();

  // ── Outside click ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load clients ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadAllClients = async () => {
      try {
        const response = await clientService.getClients();
        setAllClients(response.data || []);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setInitialLoadDone(true);
      }
    };
    loadAllClients();
  }, []);

  // ── Filter clients ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showDropdown) return;
    if (clientSearch.length < 2) {
      setClients(allClients);
    } else {
      const q = clientSearch.toLowerCase();
      setClients(
        allClients.filter(
          (c) =>
            c.customerName?.toLowerCase().includes(q) ||
            c.businessName?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q)
        )
      );
    }
  }, [clientSearch, allClients, showDropdown]);

  // ── Client handlers ────────────────────────────────────────────────────────
  const handleInputFocus = () => {
    if (!selectedClient) {
      setShowDropdown(true);
      if (clientSearch.length < 2) setClients(allClients);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch('');
    setShowDropdown(false);

    setValue('customerName', client.customerName || '');
    setValue('businessName', client.businessName || '');
    setValue('email', client.email || '');
    setValue('mobile', client.mobile || '');
    if (client.industry) setValue('industry', client.industry);
    if (client.description) setValue('description', client.description);

    const addr = client.address || {};
    setValue('address.street', addr.street || '');
    setValue('address.city', addr.city || '');
    setValue('address.state', addr.state || '');
    setValue('address.country', addr.country || '');
    setValue('address.zipCode', addr.zipCode || '');
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    ['customerName', 'businessName', 'email', 'mobile', 'industry', 'description',
      'address.street', 'address.city', 'address.state', 'address.country', 'address.zipCode',
    ].forEach((field) => setValue(field, ''));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const addressData = {
        street: data['address.street']?.trim() || undefined,
        city: data['address.city']?.trim() || undefined,
        state: data['address.state']?.trim() || undefined,
        country: data['address.country']?.trim() || undefined,
        zipCode: data['address.zipCode']?.trim() || undefined,
      };
      const hasAddress = Object.values(addressData).some(Boolean);

      const projectData = {
        customerName: data.customerName,
        businessName: data.businessName,
        mobile: data.mobile,
        email: data.email,
        projectName: data.projectName || undefined,
        industry: data.industry || undefined,
        description: data.description || undefined,
        budget: data.budget ? Number(data.budget) : undefined,
        timeline:
          data.timelineStartDate || data.timelineEndDate
            ? {
                startDate: data.timelineStartDate
                  ? new Date(data.timelineStartDate)
                  : undefined,
                endDate: data.timelineEndDate
                  ? new Date(data.timelineEndDate)
                  : undefined,
              }
            : undefined,
        ...(hasAddress ? { address: addressData } : {}),
      };

      if (selectedClient) {
        projectData.client = selectedClient._id;
        if (!hasAddress && selectedClient.address) {
          const ca = selectedClient.address;
          if (ca.street || ca.city || ca.state || ca.country || ca.zipCode) {
            projectData.address = {
              street: ca.street || undefined,
              city: ca.city || undefined,
              state: ca.state || undefined,
              country: ca.country || undefined,
              zipCode: ca.zipCode || undefined,
            };
          }
        }
      }

      const response = await projectService.createProject(projectData);
      toast.success('Project created successfully!');
      navigate(`/dashboard/projects/${response.data._id}/assign-team`);
    } catch (error) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/projects')}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-1">
            Start a new client project and begin the onboarding process.
          </p>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Select Client</h2>
          <p className="text-sm text-gray-500 mt-1">
            Search and select an existing client to auto-fill their details.
          </p>
        </CardHeader>
        <CardBody className="pt-2">
          {selectedClient ? (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Building className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedClient.customerName}</h3>
                    <p className="text-sm text-gray-600">{selectedClient.businessName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedClient.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedClient.mobile}
                      </span>
                    </div>
                    {(() => {
                      const addr = selectedClient.address || {};
                      const parts = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean);
                      return parts.length > 0 ? (
                        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{parts.join(', ')}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <button onClick={handleClearClient} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search or select client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                onFocus={handleInputFocus}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {!initialLoadDone && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>

              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {clients.length > 0 ? (
                    clients.map((client) => {
                      const addr = client.address || {};
                      const hasAddr = addr.city || addr.state || addr.country;
                      return (
                        <button
                          key={client._id}
                          type="button"
                          onClick={() => handleSelectClient(client)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{client.customerName}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {client.businessName} • {client.email}
                              </p>
                              {hasAddr && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {[addr.city, addr.state, addr.country].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {clientSearch.length >= 2 ? 'No clients found.' : 'No clients available.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the project and customer details below.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Project Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Project Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Project Name"
                  placeholder="TechStart Landing Page"
                  error={errors.projectName?.message}
                  {...register('projectName')}
                />
                <Input
                  label="Industry"
                  placeholder="Technology, E-commerce, etc."
                  error={errors.industry?.message}
                  {...register('industry')}
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of the project..."
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[100px] ${
                    errors.description ? 'border-red-400' : 'border-gray-200'
                  }`}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Customer Name *"
                  placeholder="John Doe"
                  error={errors.customerName?.message}
                  {...register('customerName')}
                />
                <Input
                  label="Business Name *"
                  placeholder="Acme Corporation"
                  error={errors.businessName?.message}
                  {...register('businessName')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="1234567890"
                  pattern="[0-9]{10,13}"
                  inputMode="numeric"
                  required
                  error={errors.mobile?.message}
                  {...register('mobile', {
                    onChange: (e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      e.target.value = value;
                    }
                  })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              {/* Address Fields */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Address
                </h4>
                <Input
                  label="Street Address"
                  placeholder="123 Main Street"
                  error={errors['address.street']?.message}
                  {...register('address.street')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="City"
                    placeholder="New York"
                    error={errors['address.city']?.message}
                    {...register('address.city')}
                  />
                  <Input
                    label="State/Province"
                    placeholder="NY"
                    error={errors['address.state']?.message}
                    {...register('address.state')}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Country"
                    placeholder="United States"
                    error={errors['address.country']?.message}
                    {...register('address.country')}
                  />
                  <Input
                    label="Zip/Postal Code"
                    placeholder="10001"
                    error={errors['address.zipCode']?.message}
                    {...register('address.zipCode')}
                  />
                </div>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Budget & Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Budget ($)"
                  type="number"
                  min={0}
                  placeholder="5000"
                  required
                  error={errors.budget?.message}
                  {...register('budget')}
                />
                <Input
                  label="Start Date"
                  type="date"
                  required
                  error={errors.timelineStartDate?.message}
                  {...register('timelineStartDate')}
                />
                <Input
                  label="End Date"
                  type="date"
                  required
                  min={minEndDate}
                  error={errors.timelineEndDate?.message}
                  {...register('timelineEndDate')}
                />
              </div>
              {/* Cross-field date hint */}
              {watchedStartDate && (
                <p className="mt-1.5 text-xs text-gray-400">
                  {/* End date must be at least 2 days af ter the start date. */}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard/projects')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Project
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}