# Enhanced Collection Table Features

## Overview

The collection table has been completely redesigned with advanced features for maximum customization and data visibility.

## ✨ New Features

### 1. **Dark UI Controls for Visibility** 
- ✅ **Filter field**: Dark gray background (#2c2c2c) with white text
- ✅ **Sort dropdown**: Dark gray background (#2c2c2c) with white text  
- ✅ **Sort direction button**: Shows ↑/↓ with proper contrast

### 2. **Draggable Column Reordering** 
- ✅ **Drag and drop**: Click and drag column headers to reorder
- ✅ **Visual feedback**: Columns highlight during drag
- ✅ **Fixed columns**: Card Name and Actions cannot be moved
- ✅ **Persistent ordering**: Column arrangement is saved automatically

### 3. **Column Visibility Dropdown** 
- ✅ **Columns menu**: Gear icon (⚙️) opens column visibility panel
- ✅ **Checkbox controls**: Toggle any column on/off (except fixed columns)
- ✅ **Visual indicators**: Shows which columns are visible
- ✅ **Fixed column labels**: Card Name and Actions marked as "(Fixed)"

### 4. **Expanded Data Columns**

#### **Core Columns (Always Available)**
- **Quantity**: Number of copies owned
- **Card Name**: Card name (fixed, always visible)
- **Set Icon**: Visual set symbol with fallback to text
- **Foil**: Foil status indicator (✨ FOIL)
- **Actions**: Quantity controls and remove button (fixed)

#### **New Data Columns**
- **Set Code**: 3-letter set abbreviation (e.g., "DOM", "RNA")
- **Set Name**: Full expansion name (e.g., "Dominaria", "Ravnica Allegiance")  
- **Card Number**: Collector number (e.g., "123", "45a")
- **Rarity**: Single letter with color coding (C/U/R/M/S)
- **Condition**: Card condition (NM, LP, MP, HP, etc.)
- **Language**: 2-letter language code (EN, JP, etc.)
- **Current Price**: Live market price from unified pricing system
- **Purchase Price**: What you paid for the card
- **Net Gain %**: Calculated profit/loss percentage (green=profit, red=loss)
- **Date Added**: When the card was added to your collection

### 5. **Smart Pricing Integration**
- ✅ **Live pricing**: Fetches current market prices from Scryfall/TCGPlayer
- ✅ **Foil pricing**: Correctly handles foil vs non-foil pricing
- ✅ **Gain calculation**: Automatically calculates ROI percentage
- ✅ **Color coding**: Green for profits, red for losses
- ✅ **Loading states**: Shows "..." while fetching prices

## 🎯 Usage Instructions

### **Column Management**
1. Click the **"Columns ⚙️"** button in the top right
2. Check/uncheck columns you want to show/hide
3. Card Name and Actions cannot be toggled (they're fixed)
4. Your preferences are saved automatically

### **Column Reordering**
1. Click and hold any column header (except fixed ones)
2. Drag left or right to reorder
3. Look for the drag handles (⋮⋮) on moveable columns
4. Release to drop in new position

### **Filtering and Sorting**
1. Use the **dark filter field** to search by card name, set name, set code, or card number
2. Use the **dark sort dropdown** to choose sort criteria
3. Click the **arrow button** to toggle ascending/descending order
4. Click any **sortable column header** to sort by that column

### **Price Data**
- **Current Price**: Shows live market price (updates automatically)
- **Purchase Price**: Enter manually when importing/adding cards
- **Net Gain %**: Automatically calculated as `((Current - Purchase) / Purchase) * 100`

## 🔧 Technical Implementation

### **Drag and Drop**
- Uses `@dnd-kit/core` for React 19 compatibility
- Horizontal sorting with `@dnd-kit/sortable`
- Keyboard accessibility with `sortableKeyboardCoordinates`
- Visual feedback with transform animations

### **State Management**
- Column configuration stored in `localStorage` as `collection-table-columns`
- Persistent across browser sessions
- Automatic migration from default configuration
- Real-time updates without page refresh

### **Pricing System**
- Integrates with existing `UnifiedPricing` utility
- Handles both foil and non-foil pricing
- Caches results to minimize API calls
- Graceful error handling with fallback values

### **Performance Optimizations**
- `useMemo` for expensive filtering/sorting operations
- React hooks properly separated from render objects
- Lazy price loading only for visible items
- Optimized re-renders with proper dependencies

## 📊 Available Data Points

### **Always Visible Options**
- Quantity ✓
- Card Name ✓ (Fixed)
- Actions ✓ (Fixed)

### **Toggleable Columns**
- Set Icon 👁️
- Set Code 📝
- Set Name 📝  
- Card Number #️⃣
- Rarity 💎
- Condition 📋
- Language 🌍
- Foil ✨
- Current Price 💰
- Purchase Price 💳
- Net Gain % 📈
- Date Added 📅

## 🚀 Benefits

### **For Collectors**
- **Complete visibility** into collection value and performance
- **Custom workflows** with personalized column arrangements  
- **Investment tracking** with profit/loss calculations
- **Flexible organization** with powerful filtering and sorting

### **For Traders**
- **Quick value assessment** with live pricing
- **Condition tracking** for accurate valuations
- **ROI analysis** to identify profitable cards
- **Market trend awareness** through price monitoring

### **For Casual Users**
- **Simple interface** with only the columns you need
- **Easy customization** without complex setup
- **Familiar interactions** with drag and drop
- **Persistent preferences** that remember your choices

## 💡 Pro Tips

1. **Hide unused columns** to focus on what matters to you
2. **Drag frequently-used columns** closer to the left
3. **Use the filter** with set codes for quick set-specific searches  
4. **Sort by Net Gain %** to see your best and worst performing cards
5. **Track purchase prices** to get meaningful ROI calculations
6. **Sort by Date Added** to see your most recent acquisitions

## 🔮 Future Enhancements

- Export filtered views to CSV/Excel
- Bulk edit capabilities for selected rows
- Advanced filtering with multiple criteria
- Custom column calculations
- Collection analytics and reporting
- Price history graphs and trends

---

The enhanced collection table transforms collection management from a simple list into a powerful data analysis tool, giving you complete control over how you view and interact with your Magic collection!