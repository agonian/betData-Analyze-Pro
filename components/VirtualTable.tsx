import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MatchData, COLUMNS, FilterState } from '../types';
import { Filter, ArrowUp, ArrowDown, Search, X, Hand, Lock } from 'lucide-react';

interface VirtualTableProps {
  data: MatchData[];
  isDemo?: boolean;
}

const ROW_HEIGHT = 40;

// Mapping for user-friendly column names
const COLUMN_LABELS: Record<string, string> = {
  Tarih: "Tarih",
  Lig: "Lig",
  EvSahibi: "Ev Sahibi",
  Deplasman: "Deplasman",
  Iy: "İY",
  Ms: "MS",
  Iy05: "İY 0.5",
  Iy15: "İY 1.5",
  Ms15: "MS 1.5",
  Ms25: "MS 2.5",
  Ms35: "MS 3.5",
  Kg: "KG",
  Ms1: "1",
  MsX: "X",
  Ms2: "2",
  Ust25: "2.5 Üst",
  Alt25: "2.5 Alt",
  KgVar: "KG Var",
  KgYok: "KG Yok",
  IyMs: "İY/MS",
  Arti6: "6+"
};

// Helper to determine specific width for each column type
const getColumnWidth = (col: string): number => {
  // Broad categories
  if (['EvSahibi', 'Deplasman'].includes(col)) return 200; // Teams need space
  if (['Lig'].includes(col)) return 140; // League needs medium space
  if (['Tarih'].includes(col)) return 100; // Date needs fixed small space
  if (['Iy', 'Ms', 'IyMs'].includes(col)) return 80; // Results
  
  // All other stats/odds (Ms1, MsX, KgVar etc) are numbers, so they can be narrow
  return 70; 
};

export const VirtualTable: React.FC<VirtualTableProps> = ({ data, isDemo = false }) => {
  const [filters, setFilters] = useState<FilterState>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof MatchData; direction: 'asc' | 'desc' } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startScrollTop, setStartScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate widths once
  const columnWidths = useMemo(() => {
    return COLUMNS.map(col => getColumnWidth(col as string));
  }, []);

  const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);

  // 0. Reset Scroll when Filters Change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [filters]);

  // 1. Filtering Logic
  const filteredData = useMemo(() => {
    let processData = data;
    
    // Logic: In demo mode, we might pass the full data but only show top 50, 
    // OR the parent passes sliced data. Assuming parent handles the strict slicing for security,
    // but here we can add visual cues.
    
    if (Object.keys(filters).length === 0) return processData;

    return processData.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = String(item[key as keyof MatchData] || '').toLowerCase();
        return itemValue.includes((value as string).toLowerCase());
      });
    });
  }, [data, filters]);

  // 2. Sorting Logic
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      
      const aNum = parseFloat(String(aValue));
      const bNum = parseFloat(String(bValue));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // 3. Virtualization Logic
  const totalHeight = sortedData.length * ROW_HEIGHT;
  const viewportHeight = 600;
  const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const buffer = 15;
  const visibleStartIndex = Math.max(0, startIndex - buffer);
  const visibleEndIndex = Math.min(
    sortedData.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + buffer
  );
  
  const visibleData = sortedData.slice(visibleStartIndex, visibleEndIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleFilterChange = (column: keyof MatchData, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const handleSort = (column: keyof MatchData) => {
    setSortConfig((current) => {
      if (current?.key === column && current.direction === 'asc') {
        return { key: column, direction: 'desc' };
      }
      return { key: column, direction: 'asc' };
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Drag to Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't trigger drag if clicking input or button
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    
    setIsDragging(true);
    if(containerRef.current) {
        setStartX(e.pageX - containerRef.current.offsetLeft);
        setScrollLeft(containerRef.current.scrollLeft);
        setStartY(e.pageY - containerRef.current.offsetTop);
        setStartScrollTop(containerRef.current.scrollTop);
        containerRef.current.style.cursor = 'grabbing';
        containerRef.current.style.userSelect = 'none';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if(containerRef.current) {
        containerRef.current.style.cursor = 'grab';
        containerRef.current.style.removeProperty('user-select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    
    // Horizontal Move
    const x = e.pageX - containerRef.current.offsetLeft;
    const walkX = (x - startX) * 1.5; // Scroll-fast multiplier
    containerRef.current.scrollLeft = scrollLeft - walkX;

    // Vertical Move
    const y = e.pageY - containerRef.current.offsetTop;
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollTop = startScrollTop - walkY;
  };

  // Generate grid template columns string
  const gridTemplateColumns = columnWidths.map(w => `${w}px`).join(' ');

  return (
    <div className="border border-gray-200 rounded-lg shadow-xl bg-white flex flex-col h-[700px] overflow-hidden relative">
      {/* Top Info Bar */}
      <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center text-sm z-20 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-6 text-gray-600">
          <span className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-gray-400"></div>
             Toplam: <span className="font-semibold text-gray-900">
               {isDemo ? (
                 <span className="flex items-center gap-1">50 <span className="text-gray-400 font-normal">(Demo Sınırı)</span></span>
               ) : (
                 data.length.toLocaleString()
               )}
             </span>
          </span>
          <span className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${filteredData.length < data.length ? 'bg-blue-500' : 'bg-green-500'}`}></div>
             Gösterilen: <span className="font-semibold text-gray-900">{filteredData.length.toLocaleString()}</span>
          </span>
          <span className="text-xs text-gray-400 flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100 hidden md:flex">
            <Hand size={12} className="mr-1" /> Tabloyu tutup sürükleyebilirsiniz
          </span>
        </div>
        
        {Object.keys(filters).length > 0 && (
          <button 
            onClick={clearFilters}
            className="group flex items-center text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-full transition-all border border-red-100"
          >
            <X size={14} className="mr-1.5 group-hover:rotate-90 transition-transform duration-300" /> 
            Filtreleri Temizle
          </button>
        )}
      </div>
      
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        className="overflow-auto relative flex-1 w-full bg-gray-50 cursor-grab active:cursor-grabbing"
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {/* Content Wrapper */}
        <div style={{ width: totalTableWidth, minWidth: '100%' }}>
            
            {/* Sticky Header */}
            <div 
              className="sticky top-0 z-10 grid bg-slate-800 text-slate-100 shadow-md" 
              style={{ 
                gridTemplateColumns: gridTemplateColumns,
                width: totalTableWidth
              }}
            >
            {COLUMNS.map((col, index) => (
                <div 
                    key={col} 
                    className="p-2 border-r border-slate-700/50 flex flex-col gap-2 h-[86px] justify-between relative group"
                >
                    {/* Header Title & Sort */}
                    <div 
                    className="flex items-center justify-between font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-white text-slate-300 transition-colors select-none pt-1"
                    onClick={() => handleSort(col)}
                    >
                        <span className="truncate mr-1" title={COLUMN_LABELS[col as string] || String(col)}>
                           {COLUMN_LABELS[col as string] || col}
                        </span>
                        {sortConfig?.key === col ? (
                            sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-400 flex-shrink-0" /> : <ArrowDown size={14} className="text-blue-400 flex-shrink-0" />
                        ) : (
                            <div className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30"><ArrowUp size={12} /></div>
                        )}
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Ara"
                            className="w-full bg-slate-700 text-white text-[11px] py-1.5 pl-6 pr-2 rounded border border-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                            onChange={(e) => handleFilterChange(col, e.target.value)}
                            value={filters[col] || ''}
                            // Stop propagation to prevent drag start when clicking input
                            onMouseDown={(e) => e.stopPropagation()} 
                        />
                        <Search size={10} className="absolute left-2 top-2.5 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            ))}
            </div>

            {/* Rows Container */}
            <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleData.map((row, index) => {
                const top = (visibleStartIndex + index) * ROW_HEIGHT;
                
                return (
                <div
                    key={row.id}
                    className="absolute left-0 w-full grid hover:bg-blue-50/80 transition-colors border-b border-gray-200/60 bg-white items-stretch"
                    style={{ 
                        top, 
                        height: ROW_HEIGHT,
                        gridTemplateColumns: gridTemplateColumns,
                        width: totalTableWidth
                    }}
                >
                    {COLUMNS.map((col) => {
                      const value = String(row[col] || '');
                      let bgClass = '';
                      let textClass = 'text-gray-700';
                      
                      const targetCols = ['Iy05', 'Iy15', 'Ms15', 'Ms25', 'Ms35', 'Kg'];
                      
                      if (targetCols.includes(col as string)) {
                        if (value.toUpperCase() === 'ÜST') {
                          bgClass = 'bg-green-500';
                          textClass = 'text-white font-bold';
                        } else if (value.toUpperCase() === 'ALT') {
                          bgClass = 'bg-red-500';
                          textClass = 'text-white font-bold';
                        }
                      }
                      
                      return (
                        <div 
                          key={`${row.id}-${col}`} 
                          className={`px-3 text-xs border-r border-gray-100 truncate flex items-center h-full ${bgClass} ${textClass}`}
                        >
                            <span title={value}>{value}</span>
                        </div>
                      );
                    })}
                </div>
                );
            })}
            </div>
            
            {sortedData.length === 0 && (
                <div className="absolute top-32 left-0 right-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                    <div className="bg-gray-100 p-4 rounded-full mb-3">
                        <Filter className="w-8 h-8 text-gray-300" />
                    </div>
                    <p>Bu kriterlere uygun kayıt bulunamadı.</p>
                </div>
            )}
        </div>
      </div>
      
      {/* Demo Overlay for visual cue (if rows are less than viewport) */}
      {isDemo && data.length === 50 && (
         <div className="absolute bottom-0 w-full h-10 bg-gradient-to-t from-gray-200 to-transparent pointer-events-none opacity-50 z-30" />
      )}
    </div>
  );
};