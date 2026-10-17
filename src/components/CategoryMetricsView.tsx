import React from 'react';
import {
  Globe,
  Compass,
  Zap,
  BarChart3,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Continent, QuestionAggregates, Difficulty } from '../types';

interface CategoryMetricsViewProps {
  aggregates: QuestionAggregates | null;
  onLaunchQuizWithCategory: (continent: Continent | 'All', topic: string | 'All', difficulty: Difficulty | 'All') => void;
  onGoToBankWithFilter?: (continent?: Continent) => void;
}

const CONTINENTS_CONFIG: {
  name: Continent;
  iconColor: string;
  badgeBg: string;
  description: string;
  image: string;
}[] = [
  {
    name: 'Africa',
    iconColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    description: 'Nile, Sahara, Kilimanjaro, Rift Valley, Savannas, 54 sovereign states',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Asia',
    iconColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    description: 'Himalayas, Caspian Sea, Baikal, Yangtze, Gobi, archipelagos',
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Europe',
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    description: 'Alps, Danube, Urals, Mediterranean, Fjords, microstates',
    image: 'https://images.unsplash.com/photo-1517732306149-e8f829eb588a?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'North America',
    iconColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    description: 'Great Lakes, Rockies, Mississippi, Caribbean, Mojave, Arctic tundra',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'South America',
    iconColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    description: 'Amazon basin, Andes, Atacama, Pantanal, Angel Falls, Pampas',
    image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Oceania',
    iconColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    description: 'Great Barrier Reef, Outback, Cook Strait, Polynesia, Micronesia',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Antarctica',
    iconColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    description: 'Polar ice sheet, Vinson Massif, Erebus, McMurdo Dry Valleys',
    image: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=600&q=80',
  },
];

export const CategoryMetricsView: React.FC<CategoryMetricsViewProps> = ({
  aggregates,
  onLaunchQuizWithCategory,
  onGoToBankWithFilter,
}) => {
  const byContinent = aggregates?.byContinent || {};
  const totalPublished = aggregates?.totalPublished || 0;

  // Calculate difficulty totals across all published questions
  let totalEasy = 0;
  let totalMedium = 0;
  let totalHard = 0;
  const topicMap: { [topic: string]: { count: number; continents: Set<string> } } = {};

  for (const cKey in byContinent) {
    const data = byContinent[cKey as Continent];
    if (!data) continue;
    totalEasy += data.byDifficulty.easy || 0;
    totalMedium += data.byDifficulty.medium || 0;
    totalHard += data.byDifficulty.hard || 0;

    for (const t in data.byTopic) {
      if (!topicMap[t]) {
        topicMap[t] = { count: 0, continents: new Set() };
      }
      topicMap[t].count += data.byTopic[t];
      topicMap[t].continents.add(cKey);
    }
  }

  const sortedTopics = Object.entries(topicMap).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="space-y-8">
      {/* Top Section Intro */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Real-time Bank Analytics</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Continent & Category Breakdown
          </h1>
          <p className="text-slate-400 mt-1 max-w-2xl text-sm">
            Automatic calculation of available questions across continents, topics, and difficulties.
            Whenever new questions are added or unpublished, these live indicators update immediately.
          </p>
        </div>

        {/* Global Quiz Quick Action */}
        <button
          onClick={() => onLaunchQuizWithCategory('All', 'All', 'All')}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
        >
          <Zap className="w-4 h-4" />
          <span>Quick Quiz: All Continents ({totalPublished} MCQs)</span>
        </button>
      </div>

      {/* Difficulty Overview Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Question Difficulty Distribution Across All {totalPublished} Published MCQs</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-800/60 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Easy</span>
              <div className="text-2xl font-bold text-white mt-1">{totalEasy} MCQs</div>
              <span className="text-xs text-slate-400">
                {totalPublished > 0 ? Math.round((totalEasy / totalPublished) * 100) : 0}% of bank
              </span>
            </div>
            <button
              onClick={() => onLaunchQuizWithCategory('All', 'All', 'easy')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-colors"
            >
              Quiz Easy
            </button>
          </div>

          <div className="bg-slate-800/60 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Medium</span>
              <div className="text-2xl font-bold text-white mt-1">{totalMedium} MCQs</div>
              <span className="text-xs text-slate-400">
                {totalPublished > 0 ? Math.round((totalMedium / totalPublished) * 100) : 0}% of bank
              </span>
            </div>
            <button
              onClick={() => onLaunchQuizWithCategory('All', 'All', 'medium')}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30 transition-colors"
            >
              Quiz Medium
            </button>
          </div>

          <div className="bg-slate-800/60 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">Hard</span>
              <div className="text-2xl font-bold text-white mt-1">{totalHard} MCQs</div>
              <span className="text-xs text-slate-400">
                {totalPublished > 0 ? Math.round((totalHard / totalPublished) * 100) : 0}% of bank
              </span>
            </div>
            <button
              onClick={() => onLaunchQuizWithCategory('All', 'All', 'hard')}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 transition-colors"
            >
              Quiz Hard
            </button>
          </div>
        </div>

        {/* Proportional Segmented Progress Bar */}
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${totalPublished > 0 ? (totalEasy / totalPublished) * 100 : 0}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Easy: ${totalEasy}`}
          ></div>
          <div
            style={{ width: `${totalPublished > 0 ? (totalMedium / totalPublished) * 100 : 0}%` }}
            className="bg-amber-500 h-full transition-all duration-500"
            title={`Medium: ${totalMedium}`}
          ></div>
          <div
            style={{ width: `${totalPublished > 0 ? (totalHard / totalPublished) * 100 : 0}%` }}
            className="bg-rose-500 h-full transition-all duration-500"
            title={`Hard: ${totalHard}`}
          ></div>
        </div>
      </div>

      {/* Continents Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <span>Continent Breakdown (7 Continents)</span>
          </h2>
          <span className="text-xs text-slate-400">
            Real-time dynamic availability per continent
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CONTINENTS_CONFIG.map((c) => {
            const data = byContinent[c.name] || {
              total: 0,
              byDifficulty: { easy: 0, medium: 0, hard: 0 },
              byTopic: {},
            };
            const count = data.total;
            const topTopics = Object.entries(data.byTopic)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);

            return (
              <div
                key={c.name}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Image header with continent label */}
                  <div className="relative h-32 w-full overflow-hidden">
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.badgeBg}`}>
                        {count} Available
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4">
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>{c.name}</span>
                      </h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>

                    {/* Difficulty Mini Breakdown */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                        <span>Difficulty Spread</span>
                        <span>
                          {data.byDifficulty.easy}E • {data.byDifficulty.medium}M • {data.byDifficulty.hard}H
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${count > 0 ? (data.byDifficulty.easy / count) * 100 : 0}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Easy: ${data.byDifficulty.easy}`}
                        ></div>
                        <div
                          style={{ width: `${count > 0 ? (data.byDifficulty.medium / count) * 100 : 0}%` }}
                          className="bg-amber-500 h-full"
                          title={`Medium: ${data.byDifficulty.medium}`}
                        ></div>
                        <div
                          style={{ width: `${count > 0 ? (data.byDifficulty.hard / count) * 100 : 0}%` }}
                          className="bg-rose-500 h-full"
                          title={`Hard: ${data.byDifficulty.hard}`}
                        ></div>
                      </div>
                    </div>

                    {/* Topics Tags */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Active Topics:
                      </span>
                      {topTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {topTopics.map(([tName, tCount]) => (
                            <span
                              key={tName}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {tName} ({tCount})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No questions published yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
                  {onGoToBankWithFilter && (
                    <button
                      onClick={() => onGoToBankWithFilter(c.name)}
                      className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>View in Bank</span>
                    </button>
                  )}

                  <button
                    onClick={() => onLaunchQuizWithCategory(c.name, 'All', 'All')}
                    disabled={count === 0}
                    className={`ml-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      count > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Start Quiz</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Topics Table/List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Active Geography Topics Across Bank</h3>
          </div>
          <span className="text-xs text-slate-400">{sortedTopics.length} Distinct Topics</span>
        </div>

        {sortedTopics.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No topics available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedTopics.map(([topic, info]) => (
              <div
                key={topic}
                onClick={() => onLaunchQuizWithCategory('All', topic, 'All')}
                className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {topic}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Spans {info.continents.size} continent{info.continents.size === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {info.count} MCQs
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
