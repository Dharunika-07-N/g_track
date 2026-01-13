import React, { useState } from 'react';
import { Plus, Trash2, Code2, Terminal, Play, Save, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const AssignmentForm = ({ classroomId, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'individual',
        deadline: '',
        points: 100,
        late_policy: 'None',
        repo_prefix: '',
        starter_code_url: '',
        response_link: '',
        classroom_id: parseInt(classroomId)
    });

    const [tests, setTests] = useState([]);

    const addTest = () => {
        setTests([...tests, {
            test_name: 'New Test',
            test_type: 'Command',
            setup_commands: '',
            run_command: '',
            timeout: 10,
            points: 10,
            expected_output: ''
        }]);
    };

    const removeTest = (index) => {
        setTests(tests.filter((_, i) => i !== index));
    };

    const updateTest = (index, field, value) => {
        const newTests = [...tests];
        newTests[index][field] = value;
        setTests(newTests);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/assignments/`, {
                ...formData,
                tests: tests
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Error creating assignment');
        }
    };

    return (
        <div className="card glass" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Create Assignment</h2>
                <button onClick={onCancel} className="btn btn-secondary glass" style={{ padding: '0.5rem' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="grid grid-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Assignment Title</label>
                            <input
                                className="input"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Lab 1: Python Basics"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
                            <textarea
                                className="input"
                                rows="4"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-2">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Deadline</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    required
                                    value={formData.deadline}
                                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Max Points</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.points}
                                    onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Assignment Type</label>
                            <select
                                className="input"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="individual">Individual</option>
                                <option value="group">Group Assignment</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Repo Prefix</label>
                            <input
                                className="input"
                                value={formData.repo_prefix}
                                onChange={e => setFormData({ ...formData, repo_prefix: e.target.value })}
                                placeholder="e.g. lab1-basics"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Starter Code URL</label>
                            <input
                                className="input"
                                value={formData.starter_code_url}
                                onChange={e => setFormData({ ...formData, starter_code_url: e.target.value })}
                                placeholder="https://github.com/org/template"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Google Form URL (Responses)</label>
                            <input
                                className="input"
                                value={formData.response_link}
                                onChange={e => setFormData({ ...formData, response_link: e.target.value })}
                                placeholder="https://docs.google.com/forms/..."
                            />
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Play size={20} color="var(--primary)" />
                            Autograding Tests
                        </h3>
                        <button type="button" onClick={addTest} className="btn btn-secondary glass">
                            <Plus size={18} />
                            Add Test Case
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {tests.map((test, index) => (
                            <div key={index} className="card" style={{ background: 'rgba(255,255,255,0.03)', borderStyle: 'dashed' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <input
                                        className="input"
                                        style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 700, padding: 0, width: 'auto' }}
                                        value={test.test_name}
                                        onChange={e => updateTest(index, 'test_name', e.target.value)}
                                    />
                                    <button type="button" onClick={() => removeTest(index)} className="btn btn-danger" style={{ padding: '0.5rem' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type</label>
                                        <select className="input" value={test.test_type} onChange={e => updateTest(index, 'test_type', e.target.value)}>
                                            <option>Command</option>
                                            <option>Python</option>
                                            <option>I/O</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timeout (sec)</label>
                                        <input type="number" className="input" value={test.timeout} onChange={e => updateTest(index, 'timeout', parseInt(e.target.value))} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Points</label>
                                        <input type="number" className="input" value={test.points} onChange={e => updateTest(index, 'points', parseInt(e.target.value))} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                            <Terminal size={14} /> Run Command
                                        </label>
                                        <input className="input" style={{ fontFamily: 'monospace' }} value={test.run_command} onChange={e => updateTest(index, 'run_command', e.target.value)} placeholder="pytest tests/test_lab1.py" />
                                    </div>
                                    {test.test_type === 'I/O' && (
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Expected Output</label>
                                            <textarea className="input" style={{ fontFamily: 'monospace' }} rows="2" value={test.expected_output} onChange={e => updateTest(index, 'expected_output', e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button type="button" onClick={onCancel} className="btn btn-secondary glass">Discard</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 3rem' }}>
                        <Save size={20} />
                        Save Assignment
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssignmentForm;
