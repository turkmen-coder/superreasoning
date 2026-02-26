import React, { useState, useMemo } from 'react';
import { DOMAIN_IDS, DOMAIN_META } from '../data';
import { useTranslation } from '../i18n';

interface DomainSelectorProps {
  selectedDomainId: string;
  onSelect: (id: string) => void;
}

const DOMAIN_CATEGORIES: Record<string, { labelTr: string; labelEn: string; items: string[] }> = {
  core: {
    labelTr: 'Temel',
    labelEn: 'Core',
    items: ['auto', 'general', 'frontend', 'backend', 'architecture', 'testing', 'ui-design', 'analysis', 'image-video'],
  },
  ai: {
    labelTr: 'Yapay Zeka & Veri',
    labelEn: 'AI & Data',
    items: ['ml-ai', 'nlp-llm', 'computer-vision', 'audio-speech', 'conversational-ai', 'data-engineering', 'database-admin'],
  },
  engineering: {
    labelTr: 'Muhendislik & Altyapi',
    labelEn: 'Engineering & Infrastructure',
    items: ['devops-sre', 'cloud-native', 'networking', 'iot-embedded', 'cybersecurity', 'api-integration', 'mobile-dev'],
  },
  product: {
    labelTr: 'Urun & Buyume',
    labelEn: 'Product & Growth',
    items: ['saas-product', 'ecommerce-growth', 'content-marketing', 'developer-experience', 'game-dev'],
  },
  industry: {
    labelTr: 'Endustri & Sektorel',
    labelEn: 'Industry Verticals',
    items: ['fintech', 'healthcare', 'education-edtech', 'legal-compliance', 'blockchain-web3', 'automotive', 'aerospace-defense', 'insurance', 'pharmaceutical', 'energy-cleantech'],
  },
  operations: {
    labelTr: 'Operasyon & Destek',
    labelEn: 'Operations & Support',
    items: ['hr-talent', 'supply-chain', 'sustainability', 'robotics-automation', 'construction', 'mining-resources', 'government', 'telecom'],
  },
  lifestyle: {
    labelTr: 'Yasam & Toplum',
    labelEn: 'Lifestyle & Society',
    items: ['travel-hospitality', 'food-beverage', 'fashion-retail', 'sports-fitness', 'media-entertainment', 'social-impact', 'mental-health', 'research-academia', 'real-estate', 'agriculture', 'accessibility', 'localization-i18n', 'data-privacy'],
  },
};

const DomainSelector: React.FC<DomainSelectorProps> = ({ selectedDomainId, onSelect }) => {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('core');

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return DOMAIN_IDS.filter((id) => {
      const text = t.domains[id as keyof typeof t.domains];
      if (!text) return false;
      const meta = DOMAIN_META[id];
      return (
        text.name.toLowerCase().includes(q) ||
        text.description.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        (meta?.icon && meta.icon.includes(q))
      );
    });
  }, [search, t, language]);

  const renderDomainButton = (domainId: string) => {
    const isSelected = selectedDomainId === domainId;
    const text = t.domains[domainId as keyof typeof t.domains];
    if (!text) return null;
    const meta = DOMAIN_META[domainId];

    return (
      <button
        key={domainId}
        type="button"
        onClick={() => onSelect(domainId)}
        aria-pressed={isSelected}
        title={`${text.name}: ${text.description}`}
        className={`
          relative flex flex-col items-center justify-center gap-1.5 w-[90px] h-[78px] rounded-xl border transition-all duration-300
          focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-black
          ${isSelected
            ? 'border-cyber-primary/60 bg-cyber-primary/5 text-cyber-primary shadow-neon-cyan'
            : 'glass-card text-gray-500 hover:border-cyber-primary/30 hover:text-gray-400 hover:bg-cyber-dark/60'
          }
        `}
      >
        {isSelected && (
          <div className="absolute top-1 right-1">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#06e8f9" stroke="none">
              <path d="M12 0l3.09 6.26L22 7.27l-5 4.87 1.18 6.88L12 15.4l-6.18 3.62L7 12.14 2 7.27l6.91-1.01L12 0z" />
            </svg>
          </div>
        )}

        <span className={`text-xl ${isSelected ? 'text-cyber-primary' : 'text-gray-600'}`}>
          {meta?.icon || '📦'}
        </span>
        <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-center leading-tight px-1">
          {text.name.length > 16 ? text.name.slice(0, 14) + '..' : text.name}
        </span>
      </button>
    );
  };

  const domainsToShow = filtered || (DOMAIN_CATEGORIES[activeCategory]?.items ?? []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'tr' ? 'Domain ara...' : 'Search domains...'}
          className="w-full pl-8 pr-3 py-1.5 bg-cyber-dark/60 border border-glass-border rounded-md text-[10px] font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyber-primary/40"
        />
      </div>

      {!filtered && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(DOMAIN_CATEGORIES).map(([catId, cat]) => (
            <button
              key={catId}
              onClick={() => setActiveCategory(catId)}
              className={`px-2 py-0.5 rounded-full text-[8px] font-display font-mono uppercase tracking-wider transition-colors ${
                activeCategory === catId
                  ? 'bg-cyber-primary/15 text-cyber-primary border border-cyber-primary/30'
                  : 'text-gray-500 border border-glass-border hover:text-gray-400 hover:border-glass-border'
              }`}
            >
              {language === 'tr' ? cat.labelTr : cat.labelEn} ({cat.items.length})
            </button>
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 ? (
        <p className="text-center text-gray-600 font-mono text-[10px] py-4">
          {language === 'tr' ? 'Sonuc bulunamadi' : 'No results found'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {domainsToShow.map((id) => renderDomainButton(id))}
        </div>
      )}

      <div className="flex items-center justify-between px-1 pt-1 border-t border-glass-border">
        <span className="font-mono text-[8px] text-gray-600">
          {DOMAIN_IDS.length} {language === 'tr' ? 'domain' : 'domains'}
        </span>
        {selectedDomainId !== 'auto' && (
          <span className="font-mono text-[8px] text-cyber-primary">
            {t.domains[selectedDomainId as keyof typeof t.domains]?.name}
          </span>
        )}
      </div>
    </div>
  );
};

export default DomainSelector;
