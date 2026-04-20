const Client = require('../models/Client');
const Project = require('../models/Project');

// @desc    Get all clients (within organization)
// @route   GET /api/clients
// @access  Private (Admin only)
exports.getClients = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    let query = { organizationId: req.user.currentOrganization };

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: clients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private (Admin only)
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.user.currentOrganization
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get client's projects
    const projects = await Project.find({ client: client._id })
      .select('projectName status overallProgress createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        ...client.toObject(),
        projects
      }
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client',
      error: error.message
    });
  }
};

// @desc    Create new client
// @route   POST /api/clients
// @access  Private (Admin only)
exports.createClient = async (req, res) => {
  try {
    // Check if client with same email already exists in organization
    const existingClient = await Client.findOne({
      email: req.body.email.toLowerCase(),
      organizationId: req.user.currentOrganization
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'A client with this email already exists'
      });
    }

    const client = await Client.create({
      ...req.body,
      organizationId: req.user.currentOrganization,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Error creating client:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: error.message
    });
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private (Admin only)
exports.updateClient = async (req, res) => {
  try {
    let client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.user.currentOrganization
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check email uniqueness if email is being changed
    if (req.body.email && req.body.email.toLowerCase() !== client.email) {
      const existingClient = await Client.findOne({
        email: req.body.email.toLowerCase(),
        organizationId: req.user.currentOrganization,
        _id: { $ne: req.params.id }
      });

      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'A client with this email already exists'
        });
      }
    }

    client = await Client.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: client,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: error.message
    });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private (Admin only)
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      organizationId: req.user.currentOrganization
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if client has projects
    const projectCount = await Project.countDocuments({ client: client._id });

    if (projectCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete client. They have ${projectCount} project(s) associated.`
      });
    }

    await client.deleteOne();

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: error.message
    });
  }
};

// @desc    Search clients (for dropdown/autocomplete)
// @route   GET /api/clients/search
// @access  Private (Admin only)
exports.searchClients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const clients = await Client.find({
      organizationId: req.user.currentOrganization,
      $or: [
        { customerName: { $regex: q, $options: 'i' } },
        { businessName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('customerName businessName email mobile industry address.street address.city address.state address.country address.zipCode')
    .limit(20)
    .sort({ customerName: 1 });

    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search clients',
      error: error.message
    });
  }
};