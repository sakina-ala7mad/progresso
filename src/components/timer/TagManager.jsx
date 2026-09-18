import { useState, useEffect } from "react";

const TAG_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F8C471", "#82E0AA", "#F1948A", "#85C1E9", "#D7BDE2",
  "#A9DFBF", "#F9E79F", "#D5A6BD", "#A3E4D7", "#FADBD8",
  "#D6EAF8", "#D5DBDB", "#FAD7A0", "#A9CCE3", "#D2B4DE",
  "#AED6F1", "#A3E4D7", "#F8D7DA", "#D1F2EB", "#FCF3CF"
];

export default function TagManager({ isOpen, onClose, onTagSelect, selectedTag }) {
  const [tags, setTags] = useState(() => {
    const saved = localStorage.getItem('productivity-tags');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "reading", color: "#96CEB4" },
      { id: 2, name: "studying", color: "#4ECDC4" },
      { id: 3, name: "working", color: "#45B7D1" },
      { id: 4, name: "scrimpa course", color: "#FFEAA7" },
      { id: 5, name: "lulus", color: "#DDA0DD" }
    ];
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  useEffect(() => {
    localStorage.setItem('productivity-tags', JSON.stringify(tags));
  }, [tags]);

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        id: Date.now(),
        name: newTagName.trim(),
        color: selectedColor
      };
      setTags([...tags, newTag]);
      setNewTagName("");
      setIsCreating(false);
    }
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setSelectedColor(tag.color);
  };

  const handleUpdateTag = () => {
    if (newTagName.trim()) {
      setTags(tags.map(tag => 
        tag.id === editingTag.id 
          ? { ...tag, name: newTagName.trim(), color: selectedColor }
          : tag
      ));
      setEditingTag(null);
      setNewTagName("");
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTag(null);
    setNewTagName("");
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        maxWidth: 400,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: 20, 
          fontSize: 24, 
          fontWeight: 700,
          color: '#333'
        }}>
          Tags
        </h2>

        {/* Create/Edit Tag Form */}
        {(isCreating || editingTag) && (
          <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12 }}>
            <input
              type="text"
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 16,
                marginBottom: 12
              }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Choose color:</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: 8 
              }}>
                {TAG_COLORS.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: selectedColor === color ? '3px solid #333' : '1px solid #ddd',
                      backgroundColor: color,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingTag ? handleUpdateTag : handleCreateTag}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#4ECDC4',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {editingTag ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Tags List */}
        <div style={{ marginBottom: 20 }}>
          {tags.map(tag => (
            <div
              key={tag.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 12,
                marginBottom: 8,
                backgroundColor: selectedTag?.id === tag.id ? '#e3f2fd' : 'white',
                borderRadius: 8,
                border: '1px solid #eee'
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: tag.color,
                  marginRight: 12
                }}
              />
              <span style={{ flex: 1, fontSize: 16 }}>{tag.name}</span>
              <button
                onClick={() => handleEditTag(tag)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  marginRight: 8,
                  fontSize: 12
                }}
              >
                ✏️
              </button>
              <button
                onClick={() => {
                  // Delete tag functionality
                  if (window.confirm(`Are you sure you want to delete "${tag.name}"?`)) {
                    setTags(tags.filter(t => t.id !== tag.id));
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  marginRight: 8,
                  fontSize: 12
                }}
              >
                ✕
              </button>
              <button
                onClick={() => onTagSelect(tag)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: selectedTag?.id === tag.id ? '#4ECDC4' : '#f0f0f0',
                  color: selectedTag?.id === tag.id ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {selectedTag?.id === tag.id ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
        </div>

        {/* Add New Tag Button */}
        {!isCreating && !editingTag && (
          <button
            onClick={() => setIsCreating(true)}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '2px dashed #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: 16,
              marginBottom: 16
            }}
          >
            + Add new tag
          </button>
        )}

        {/* Save Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#4ECDC4',
            color: 'white',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

