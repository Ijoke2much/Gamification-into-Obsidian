import React, { useState } from 'react';
import { Quest } from '../utils/taskParser';

interface QuestTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  defaultXP: number;
  defaultCP: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  subtasks: string[];
  skills: string[];
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    category: 'daily-routine',
    description: 'Start your day with productive habits',
    icon: '🌅',
    defaultXP: 100,
    defaultCP: 10,
    difficulty: 'easy',
    estimatedTime: 30,
    subtasks: [
      'Make your bed',
      'Drink water',
      'Exercise for 10 minutes',
      'Plan your day'
    ],
    skills: ['discipline']
  },
  {
    id: 'skill-practice',
    name: 'Skill Practice',
    category: 'learning',
    description: 'Dedicated time for skill development',
    icon: '🎯',
    defaultXP: 200,
    defaultCP: 20,
    difficulty: 'medium',
    estimatedTime: 60,
    subtasks: [
      'Choose a skill to practice',
      'Set specific learning goals',
      'Practice for 45 minutes',
      'Review and reflect on progress'
    ],
    skills: ['learning']
  },
  {
    id: 'project-milestone',
    name: 'Project Milestone',
    category: 'project',
    description: 'Complete a significant project milestone',
    icon: '🏗️',
    defaultXP: 500,
    defaultCP: 50,
    difficulty: 'hard',
    estimatedTime: 240,
    subtasks: [
      'Define the milestone',
      'Break down into tasks',
      'Complete core deliverables',
      'Review and document progress'
    ],
    skills: ['project-management']
  },
  {
    id: 'social-connection',
    name: 'Social Connection',
    category: 'social',
    description: 'Strengthen relationships and connections',
    icon: '🤝',
    defaultXP: 150,
    defaultCP: 15,
    difficulty: 'easy',
    estimatedTime: 45,
    subtasks: [
      'Reach out to a friend or family member',
      'Have a meaningful conversation',
      'Plan future meetup or call',
      'Follow up with any promises made'
    ],
    skills: ['communication']
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    category: 'health',
    description: 'Focus on physical and mental well-being',
    icon: '💪',
    defaultXP: 300,
    defaultCP: 30,
    difficulty: 'medium',
    estimatedTime: 90,
    subtasks: [
      'Exercise or physical activity',
      'Healthy meal preparation',
      'Mindfulness or meditation',
      'Quality sleep preparation'
    ],
    skills: ['health']
  },
  {
    id: 'coding-session',
    name: 'Coding Session',
    category: 'development',
    description: 'Dedicated programming and development work',
    icon: '💻',
    defaultXP: 250,
    defaultCP: 25,
    difficulty: 'medium',
    estimatedTime: 120,
    subtasks: [
      'Set up development environment',
      'Write code for 90 minutes',
      'Test and debug',
      'Document your work'
    ],
    skills: ['programming']
  },
  {
    id: 'writing-task',
    name: 'Writing Task',
    category: 'creative',
    description: 'Creative writing or content creation',
    icon: '✍️',
    defaultXP: 180,
    defaultCP: 18,
    difficulty: 'medium',
    estimatedTime: 90,
    subtasks: [
      'Choose a topic or theme',
      'Write for 60 minutes',
      'Edit and revise',
      'Finalize your piece'
    ],
    skills: ['writing']
  },
  {
    id: 'research-project',
    name: 'Research Project',
    category: 'academic',
    description: 'In-depth research and analysis',
    icon: '🔬',
    defaultXP: 400,
    defaultCP: 40,
    difficulty: 'hard',
    estimatedTime: 180,
    subtasks: [
      'Define research question',
      'Gather sources and data',
      'Analyze findings',
      'Write research summary'
    ],
    skills: ['research']
  }
];

interface QuestTemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuest: (quest: Partial<Quest>) => void;
}

export const QuestTemplateWizard: React.FC<QuestTemplateWizardProps> = ({
  isOpen,
  onClose,
  onCreateQuest
}) => {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<QuestTemplate | null>(null);
  const [questData, setQuestData] = useState<Partial<Quest>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = QUEST_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTemplateSelect = (template: QuestTemplate) => {
    setSelectedTemplate(template);
    setQuestData({
      title: template.name,
      description: template.description,
      xp: template.defaultXP,
      cp: template.defaultCP,
      difficulty: template.difficulty,
      skills: template.skills,
      subtasks: template.subtasks.map(text => ({ text, completed: false })),
      estimatedTime: template.estimatedTime.toString()
    });
    setStep(2);
  };

  const handleCreateQuest = () => {
    if (selectedTemplate && questData) {
      onCreateQuest({
        ...questData,
        templateId: selectedTemplate.id,
        createdDate: new Date().toISOString()
      });
      onClose();
      resetWizard();
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedTemplate(null);
    setQuestData({});
    setSearchTerm('');
  };

  const handleClose = () => {
    onClose();
    resetWizard();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '2px solid #8ecae6'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #333',
          paddingBottom: '12px'
        }}>
          <h2 style={{ margin: 0, color: '#8ecae6' }}>
            {step === 1 ? '🎯 Quest Template Wizard' : '✏️ Customize Quest'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: step >= 1 ? '#8ecae6' : '#333',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              1
            </div>
            <div style={{ color: step >= 1 ? '#8ecae6' : '#666' }}>Choose Template</div>
            <div style={{ color: '#666' }}>→</div>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: step >= 2 ? '#8ecae6' : '#333',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              2
            </div>
            <div style={{ color: step >= 2 ? '#8ecae6' : '#666' }}>Customize</div>
          </div>
        </div>

        {step === 1 && (
          <div>
            {/* Search */}
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Template Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                                     style={{
                     padding: '16px',
                     borderRadius: '8px',
                     border: '2px solid #333',
                     backgroundColor: '#2a2a2a',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease'
                   }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#8ecae6';
                    e.currentTarget.style.backgroundColor = '#3a3a3a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '24px', marginRight: '8px' }}>
                      {template.icon}
                    </span>
                    <h3 style={{ margin: 0, color: '#fff' }}>{template.name}</h3>
                  </div>
                  <p style={{ color: '#ccc', margin: '8px 0', fontSize: '14px' }}>
                    {template.description}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: '12px'
                  }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#8ecae6',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {template.difficulty}
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#4ecdc4',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {template.estimatedTime}min
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#45b7d1',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {template.defaultXP} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedTemplate && (
          <div>
            {/* Quest Customization Form */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
                Quest Title
              </label>
              <input
                type="text"
                value={questData.title || ''}
                onChange={(e) => setQuestData(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
                Description
              </label>
              <textarea
                value={questData.description || ''}
                onChange={(e) => setQuestData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
                  XP Reward
                </label>
                <input
                  type="number"
                  value={questData.xp || 0}
                  onChange={(e) => setQuestData(prev => ({ ...prev, xp: parseInt(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
                  CP Reward
                </label>
                <input
                  type="number"
                  value={questData.cp || 0}
                  onChange={(e) => setQuestData(prev => ({ ...prev, cp: parseInt(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff'
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
                  Difficulty
                </label>
                <select
                  value={questData.difficulty || 'medium'}
                  onChange={(e) => setQuestData(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff'
                  }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>
                  Priority
                </label>
                <select
                  value={questData.priority || 'medium'}
                  onChange={(e) => setQuestData(prev => ({ ...prev, priority: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Skills Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                Skills 🛠️
              </label>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '4px',
                padding: '12px',
                border: '1px solid #333'
              }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  {['discipline', 'learning', 'project-management', 'communication', 'health', 'programming', 'writing', 'research'].map(skill => (
                    <button
                      key={skill}
                      onClick={() => {
                        const currentSkills = questData.skills || [];
                        if (currentSkills.includes(skill)) {
                          setQuestData(prev => ({
                            ...prev,
                            skills: currentSkills.filter(s => s !== skill)
                          }));
                        } else {
                          setQuestData(prev => ({
                            ...prev,
                            skills: [...currentSkills, skill]
                          }));
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid #8ecae6',
                        backgroundColor: (questData.skills || []).includes(skill) ? '#8ecae6' : 'transparent',
                        color: (questData.skills || []).includes(skill) ? '#000' : '#8ecae6',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#ccc' }}>
                  Selected: {(questData.skills || []).length > 0 ? (questData.skills || []).join(', ') : 'None'}
                </div>
              </div>
            </div>

            {/* Subtasks Preview */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#fff' }}>
                Subtasks (from template)
              </label>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '4px',
                padding: '12px',
                maxHeight: '150px',
                overflow: 'auto'
              }}>
                {questData.subtasks?.map((subtask, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '4px',
                    padding: '4px 0'
                  }}>
                    <span style={{ marginRight: '8px', color: '#8ecae6' }}>•</span>
                    <span style={{ color: '#ccc', fontSize: '14px' }}>{subtask.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleCreateQuest}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#8ecae6',
                  color: '#000',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Create Quest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
