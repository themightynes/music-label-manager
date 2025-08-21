# Content Editing Guide

**Music Label Manager - Non-Developer Content Modification**  
*Quick Start Guide*

---

## 🚀 Quick Start: Your First Edit

**Goal**: Change an artist's signing cost in 5 minutes

1. **Open** `data/artists.json` in any text editor
2. **Find** the artist `"nova_sterling"`
3. **Change** `"signing_cost": 8000` to `"signing_cost": 6000`
4. **Save** the file
5. **Validate** by running: `npm run validate:content`
6. **Test** by starting the game and checking the artist discovery modal

✅ **Success!** Nova Sterling now costs $6,000 to sign instead of $8,000.

---

## 📝 Common Content Edits

### **🎤 Artist Modifications**
**File**: `data/artists.json`

**Change signing costs:**
```json
"signing_cost": 8000,    // Change this number
```

**Modify talent levels:**
```json
"talent": 85,            // 0-100 scale
```

**Update artist descriptions:**
```json
"backstory": "Your new artist description here"
```

### **💰 Economic Balance**
**File**: `data/balance.json`

**Adjust starting money:**
```json
"starting_resources": {
  "money": 75000,          // Starting cash amount
}
```

**Modify project costs:**
```json
"project_costs": {
  "single": {
    "min": 3000,           // Minimum single cost
    "max": 12000           // Maximum single cost
  }
}
```

**Change streaming revenue:**
```json
"streaming": {
  "revenue_per_stream": 0.003  // $ per stream
}
```

### **💬 Role Dialogue**
**File**: `data/roles.json`

**Modify dialogue responses:**
```json
"text": "Your new dialogue option text here"
```

**Adjust immediate effects:**
```json
"effects_immediate": {
  "money": 1000,           // Money gained/lost
  "reputation": 2,         // Reputation change
  "creative_capital": 1    // Creative capital change
}
```

---

## ⚠️ Important Rules

### **JSON Syntax Rules**
- **Always use double quotes** `"` for strings, never single quotes `'`
- **No trailing commas** - remove commas after the last item in arrays/objects
- **Numbers don't need quotes** - `1000` not `"1000"`
- **Boolean values** - `true` or `false` (no quotes)

### **Safe Editing Practices**
1. **Make small changes** - edit one thing at a time
2. **Keep backups** - copy the original file before editing
3. **Validate immediately** - run validation after each change
4. **Test in game** - verify changes work as expected

### **Common Mistakes to Avoid**
```json
// ❌ Wrong - missing quotes
{name: Sarah Mitchell}

// ✅ Correct - proper quotes
{"name": "Sarah Mitchell"}

// ❌ Wrong - trailing comma
{"money": 1000,}

// ✅ Correct - no trailing comma
{"money": 1000}
```

---

## 🔍 Validation & Testing

### **Validate Your Changes**
```bash
# Check JSON syntax is valid
npm run validate:content

# Test game balance
npm run test:balance

# Check all content loads properly
npm run test:content
```

### **Test in Game**
1. **Start the development server**: `npm run dev`
2. **Create a new game** to see your changes
3. **Check the affected areas** (artist discovery, role meetings, etc.)
4. **Verify numbers** match your changes

---

## 🛠️ Troubleshooting

### **JSON Syntax Errors**
**Error**: `Unexpected token`
**Fix**: Check for missing quotes, brackets, or commas

**Error**: `Trailing comma`
**Fix**: Remove comma after last item in array/object

### **Game Not Loading Changes**
1. **Restart the development server** - content is cached
2. **Hard refresh browser** - clear browser cache
3. **Check file was saved** - verify your changes are in the file

### **Invalid Values**
**Artist talent must be 0-100**: Don't use negative numbers or values over 100
**Costs must be positive**: Don't use negative money amounts
**IDs must be unique**: Don't duplicate existing ID values

---

## 📚 Advanced Editing

### **Adding New Artists**
1. **Copy existing artist** structure from `artists.json`
2. **Change all values** including unique `id`
3. **Add to end of array** (before closing bracket)
4. **Validate and test**

### **Creating New Dialogue**
1. **Find similar dialogue** in `roles.json` 
2. **Copy the structure** and modify text/effects
3. **Ensure unique IDs** for new choices
4. **Test all dialogue paths**

### **Balance Testing**
1. **Play full campaign** with changes
2. **Note if game becomes too easy/hard**
3. **Adjust values incrementally**
4. **Document major balance changes**

---

## 🔗 Technical References

For detailed technical information:
- **Schema definitions**: [Content Data Schemas](../02-architecture/content-data-schemas.md)
- **System integration**: [Backend Architecture](../05-backend/backend-architecture.md)
- **Troubleshooting**: [System Troubleshooting](../09-troubleshooting/consolidated-system-troubleshooting.md)

---

**Need Help?** Check the troubleshooting guide or ask a developer to review your changes before committing.