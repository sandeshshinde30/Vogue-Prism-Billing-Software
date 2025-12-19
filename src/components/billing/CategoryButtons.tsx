import { CATEGORIES } from '../../types';
import { useStore } from '../../store/useStore';

export function CategoryButtons() {
  const { selectedCategory, setSelectedCategory } = useStore();

  return (
    <div style={{ marginTop: '16px' }}>
      <p 
        className="text-xs font-medium text-slate-500 mb-2"
        style={{ 
          fontSize: '12px', 
          fontWeight: '500', 
          color: '#64748b', 
          marginBottom: '8px' 
        }}
      >
        Categories
      </p>
      <div 
        className="flex flex-wrap gap-2"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
      >
        <button
          onClick={() => setSelectedCategory(null)}
          className="h-8 px-3 text-xs font-medium rounded-md transition-colors"
          style={{
            height: '32px',
            padding: '0 12px',
            fontSize: '12px',
            fontWeight: '500',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: selectedCategory === null ? '#22c55e' : '#f1f5f9',
            color: selectedCategory === null ? 'white' : '#475569'
          }}
          onMouseEnter={(e) => {
            if (selectedCategory !== null) {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedCategory !== null) {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }
          }}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="h-8 px-3 text-xs font-medium rounded-md transition-colors"
            style={{
              height: '32px',
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: '500',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: selectedCategory === category ? '#22c55e' : '#f1f5f9',
              color: selectedCategory === category ? 'white' : '#475569'
            }}
            onMouseEnter={(e) => {
              if (selectedCategory !== category) {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategory !== category) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
              }
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}