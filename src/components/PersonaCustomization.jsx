import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import './PersonaCustomization.css';

const PersonaCustomization = ({ 
  isOpen, 
  onClose, 
  personas, 
  onSavePersona, 
  onDeletePersona,
  currentPersona,
  setCurrentPersona
}) => {
  const [newPersona, setNewPersona] = useState({
    id: '',
    label: '',
    description: '',
    prompt: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);

  useEffect(() => {
    if (editingPersona) {
      if (newPersona.id !== editingPersona.id) {
        setNewPersona(editingPersona);
        setIsEditing(true);
      }
    } else {
      if (newPersona.id !== '') {
        setNewPersona({
          id: '',
          label: '',
          description: '',
          prompt: ''
        });
        setIsEditing(false);
      }
    }
  }, [editingPersona, newPersona.id]);

  const handleSave = () => {
    if (!newPersona.id || !newPersona.label || !newPersona.prompt) {
      alert('Please fill in all required fields (ID, Label, and Prompt)');
      return;
    }

    // Validate ID format (alphanumeric with hyphens/underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(newPersona.id)) {
      alert('ID must contain only letters, numbers, hyphens, and underscores');
      return;
    }

    onSavePersona(newPersona);
    setNewPersona({
      id: '',
      label: '',
      description: '',
      prompt: ''
    });
    setIsEditing(false);
    setEditingPersona(null);
  };

  const handleEdit = (persona) => {
    setEditingPersona(persona);
  };

  const handleDelete = (personaId) => {
    if (window.confirm(`Are you sure you want to delete the "${personas[personaId]?.label}" persona?`)) {
      onDeletePersona(personaId);
      if (currentPersona === personaId) {
        setCurrentPersona('anxiety'); // Default back to anxiety persona
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="persona-customization-overlay">
      <div className="persona-customization-modal">
        <div className="modal-header">
          <h2>Customize Personas</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="existing-personas">
            <h3>Existing Personas</h3>
            <div className="persona-list">
              {Object.entries(personas).map(([id, persona]) => (
                <div key={id} className="persona-item">
                  <div className="persona-info">
                    <h4>{persona.label}</h4>
                    <p>{persona.description}</p>
                    <small>ID: {id}</small>
                  </div>
                  <div className="persona-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(persona)}
                      title="Edit persona"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(id)}
                      title="Delete persona"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="create-persona">
            <h3>{isEditing ? 'Edit Persona' : 'Create New Persona'}</h3>
            <div className="form-group">
              <label>ID *</label>
              <input
                type="text"
                value={newPersona.id}
                onChange={(e) => setNewPersona({...newPersona, id: e.target.value})}
                placeholder="e.g., my_custom_persona"
                disabled={isEditing} // Don't allow ID change when editing
              />
              <small>Use alphanumeric characters, hyphens, and underscores only</small>
            </div>

            <div className="form-group">
              <label>Label *</label>
              <input
                type="text"
                value={newPersona.label}
                onChange={(e) => setNewPersona({...newPersona, label: e.target.value})}
                placeholder="e.g., My Custom Mode"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={newPersona.description}
                onChange={(e) => setNewPersona({...newPersona, description: e.target.value})}
                placeholder="Brief description of this mode"
              />
            </div>

            <div className="form-group">
              <label>Prompt *</label>
              <textarea
                value={newPersona.prompt}
                onChange={(e) => setNewPersona({...newPersona, prompt: e.target.value})}
                placeholder="Enter the system prompt for this persona..."
                rows={4}
              />
            </div>

            <button className="save-btn" onClick={handleSave}>
              <Save size={16} />
              {isEditing ? 'Update Persona' : 'Create Persona'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaCustomization;