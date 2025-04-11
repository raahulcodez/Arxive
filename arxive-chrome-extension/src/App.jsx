import './App.css'
import { useState } from 'react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import { 
  Copy, 
  ExternalLink, 
  Wallet, 
  Archive, 
  Code, 
  FileContract, 
  Home,
  Activity,
  Chart,
  Shield,
  Terminal,
  Server
} from './components/ui/icons'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  
  const walletAddress = "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t"
  const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
  
  const contractMetrics = {
    active: 12,
    archived: 3,
    totalGasUsed: "143.5K",
    gasSaved: "61.2K",
    lastDeployment: "2h ago",
    totalDeployments: 32,
    successRate: "97%",
    avgGasPerOp: "432",
    securityScore: "A+",
    activeFunctions: 87,
    recentCalls: 143,
    codeOptimization: "79%"
  }

  const recentActivity = [
    { name: "TokenSwap.move", time: "2h ago", status: "Deployed", icon: "Activity" },
    { name: "StakingPool.move", time: "1d ago", status: "Created", icon: "FileContract" },
    { name: "NFTMarket.move", time: "3d ago", status: "Archived", icon: "Archive" },
    { name: "LendingProtocol.move", time: "4d ago", status: "Optimized", icon: "Code" },
    { name: "GovernanceDAO.move", time: "5d ago", status: "Deployed", icon: "Activity" },
    { name: "VotingSystem.move", time: "1w ago", status: "Archived", icon: "Archive" },
  ]

  const singleDayData = {
    contracts: contractMetrics.active,
    archived: contractMetrics.archived,
    gas: 143
  }

  const weekData = [
    { date: "Apr 5", contracts: 0, archived: 0 },
    { date: "Apr 6", contracts: 0, archived: 0 },
    { date: "Apr 7", contracts: 0, archived: 0 },
    { date: "Apr 8", contracts: 0, archived: 0 },
    { date: "Apr 9", contracts: 0, archived: 0 },
    { date: "Apr 10", contracts: 0, archived: 0 },
    { date: "Apr 11", contracts: contractMetrics.active, archived: contractMetrics.archived }
  ]

  const hourlyGasData = [
    { hour: "00:00", gas: 4 },
    { hour: "02:00", gas: 5 },
    { hour: "04:00", gas: 8 },
    { hour: "06:00", gas: 12 },
    { hour: "08:00", gas: 18 },
    { hour: "10:00", gas: 25 },
    { hour: "12:00", gas: 32 },
    { hour: "14:00", gas: 42 },
    { hour: "16:00", gas: 55 },
    { hour: "18:00", gas: 75 },
    { hour: "20:00", gas: 102 },
    { hour: "22:00", gas: 143 }
  ]

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const openMainApp = (route) => {
    window.open(`http://localhost:3000/dashboard/${route}`, '_blank')
  }

  const renderIcon = (iconName) => {
    switch(iconName) {
      case 'Activity':
        return <Activity className="h-4 w-4 text-[#00E5FF]" />
      case 'FileContract':
        return <FileContract className="h-4 w-4 text-[#00BFA5]" />
      case 'Archive':
        return <Archive className="h-4 w-4 text-[#9D5CFF]" />
      case 'Code':
        return <Code className="h-4 w-4 text-[#FFC107]" />
      default:
        return <Activity className="h-4 w-4 text-[#00E5FF]" />
    }
  }

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'Deployed':
        return <Badge variant="success">{status}</Badge>
      case 'Created':
        return <Badge variant="secondary">{status}</Badge>
      case 'Archived':
        return <Badge variant="accent">{status}</Badge>
      case 'Optimized':
        return <Badge variant="warning">{status}</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const TimelineGraph = ({ valueKey, color }) => {
    const value = valueKey === 'contracts' ? contractMetrics.active : contractMetrics.archived;
    
    return (
      <div className="flex h-20 items-center justify-center px-1 relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
          <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
          <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold mb-1" style={{ color: color }}>
            {value}
          </div>
          <div 
            className="w-24 rounded-t-md relative animate-pulse-subtle"
            style={{ 
              height: "70%",
              background: `linear-gradient(to top, ${color}, ${color}AA)`,
            }}
          >
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-[#121212] text-white text-xs px-2 py-1 rounded">
              {valueKey === 'contracts' ? 'Active Contracts' : 'Archived Contracts'}
            </div>
          </div>
          <span className="text-sm mt-2 font-medium text-[#E0E0E0]">
            April 11, 2025
          </span>
        </div>
      </div>
    );
  };

  const DualMetricGraph = () => {
    return (
      <div className="relative h-20 w-full pt-1">
        <div className="flex h-full">
          
          <div className="w-1/2 flex flex-col h-full">
            <div className="text-center text-[9px] text-[#00E5FF] mb-0.5 font-medium">Deployments: {contractMetrics.active}</div>
            <div className="flex-1 flex items-end justify-center">
              <div className="relative w-14 rounded-t-sm bg-gradient-to-t from-[#00E5FF] to-[#00E5FF]/30" style={{ height: '85%' }}>
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#121212] text-[#00E5FF] text-[10px] px-1 py-0.5 rounded">
                  {contractMetrics.active}
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-1/2 flex flex-col h-full">
            <div className="text-center text-[9px] text-[#9D5CFF] mb-0.5 font-medium">Archives: {contractMetrics.archived}</div>
            <div className="flex-1 flex items-end justify-center">
              <div className="relative w-14 rounded-t-sm bg-gradient-to-t from-[#9D5CFF] to-[#9D5CFF]/30" style={{ height: '25%' }}>
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#121212] text-[#9D5CFF] text-[10px] px-1 py-0.5 rounded">
                  {contractMetrics.archived}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GasUsageTrendGraph = () => {
    return (
      <div className="relative h-24 w-full overflow-hidden">
        <div className="absolute top-1 left-2 text-[10px] text-[#A0A0A0]">Gas Usage (in units)</div>
        <div className="absolute top-1 right-2 text-[10px] text-[#FFC107] font-medium">Total: {singleDayData.gas}K</div>
        <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2">
          
          <line x1="0" y1="10" x2="100" y2="10" stroke="#2A2A4E" strokeWidth="0.2" />
          <line x1="0" y1="20" x2="100" y2="20" stroke="#2A2A4E" strokeWidth="0.2" />
          <line x1="0" y1="30" x2="100" y2="30" stroke="#2A2A4E" strokeWidth="0.2" />
          
          <defs>
            <linearGradient id="gasGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFC10788" />
              <stop offset="100%" stopColor="#FFC10700" />
            </linearGradient>
          </defs>
          
          <circle cx="50" cy="20" r="15" fill="url(#gasGradient)" className="animate-pulse-subtle" />
          <circle cx="50" cy="20" r="15" fill="none" stroke="#FFC107" strokeWidth="1.5" />
          
          <circle cx="50" cy="20" r="3" fill="#FFC107" />
          
          <text x="50" y="20" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="6" fontWeight="bold">
            {singleDayData.gas}K
          </text>
        </svg>
        <div className="absolute bottom-1 right-2 text-[10px] text-[#FFC107] font-medium">April 11, 2025</div>
      </div>
    );
  };

  const WeekBarChart = ({ valueKey, color }) => {
    const maxValue = Math.max(...weekData.map(d => d[valueKey]));
    
    return (
      <div className="flex h-28 flex-col">
        
        <div className="text-[9px] text-[#A0A0A0] mb-0.5 ml-1">
          {valueKey === 'contracts' ? 'Deployed Contracts' : 'Archived Contracts'}
        </div>
        
        <div className="flex-1 flex items-end justify-between relative">
          
          <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
            <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
          </div>
          
          {weekData.map((item, index) => {
            const height = maxValue > 0 ? `${(item[valueKey] / maxValue) * 100}%` : '0%';
            const isToday = item.date === "Apr 11";
            const gradient = isToday 
              ? `linear-gradient(to top, ${color}, ${color}CC)` 
              : `linear-gradient(to top, ${color}44, ${color}11)`;
            
            return (
              <div key={index} className="flex flex-col items-center group px-0.5 z-10">
                
                {isToday && item[valueKey] > 0 && (
                  <div 
                    className="text-[10px] font-medium mb-0.5" 
                    style={{ color }}
                  >
                    {item[valueKey]}
                  </div>
                )}
                
                <div 
                  className={`w-5 rounded-t-sm relative ${isToday && item[valueKey] > 0 ? 'animate-pulse-subtle' : ''}`}
                  style={{ 
                    height,
                    background: gradient,
                    minHeight: item[valueKey] > 0 ? '20%' : '3px'
                  }}
                >
                  {isToday && item[valueKey] > 0 && (
                    <div className="w-full h-full bg-white/10 rounded-t-sm"></div>
                  )}
                </div>
                
                <span className={`text-[8px] mt-0.5 ${isToday ? `text-${color}` : 'text-[#A0A0A0]'}`}>
                  {item.date.substring(4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const HourlyLineGraph = () => {
    const maxValue = Math.max(...hourlyGasData.map(d => d.gas));
    const lastValue = hourlyGasData[hourlyGasData.length - 1].gas;
    
    return (
      <div className="h-24 w-full overflow-hidden">
        <div className="flex justify-between items-center mb-0.5">
          <div className="text-[9px] text-[#A0A0A0]">Gas Usage (24h)</div>
          <div className="text-[9px] text-[#FFC107] font-medium">Total: {lastValue}K</div>
        </div>
        
        <div className="relative h-20 w-full">
          
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
            <div className="border-t border-[#2A2A4E]/30 w-full h-0"></div>
          </div>
          
          <svg width="100%" height="100%" preserveAspectRatio="none">
            
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFC10755" />
                <stop offset="100%" stopColor="#FFC107" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFC10744" />
                <stop offset="100%" stopColor="#FFC10700" />
              </linearGradient>
            </defs>
            
            <path 
              d={`
                M0,${100 - (hourlyGasData[0].gas / maxValue) * 100} 
                ${hourlyGasData.map((point, i) => {
                  const x = (i / (hourlyGasData.length - 1)) * 100;
                  const y = 100 - (point.gas / maxValue) * 100;
                  return `L${x},${y} `;
                }).join('')}
                L100,100 L0,100 Z
              `}
              fill="url(#areaGradient)"
            />
            
            <path 
              d={`
                M0,${100 - (hourlyGasData[0].gas / maxValue) * 100} 
                ${hourlyGasData.map((point, i) => {
                  const x = (i / (hourlyGasData.length - 1)) * 100;
                  const y = 100 - (point.gas / maxValue) * 100;
                  return `L${x},${y} `;
                }).join('')}
              `}
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            <circle 
              cx="100" 
              cy={100 - (lastValue / maxValue) * 100} 
              r="2" 
              fill="#FFC107" 
              className="animate-pulse-subtle"
            />
          </svg>
          
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-[#A0A0A0]">
            <span>00:00</span>
            <span>12:00</span>
            <span className="text-[#FFC107]">22:00</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-[350px] min-h-[420px] text-white p-0 overflow-hidden rounded-lg">
    
      <div className="flex items-center justify-between p-2 mb-1 bg-[#1A1A2E] rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-[#1A1A2E] neon-border rounded">
            <img src="/favicon.ico" alt="Arxive Logo" width={16} height={16} />
          </div>
          <h1 className="text-lg font-bold text-[#00E5FF] animate-glow tracking-tight">Arxive</h1>
        </div>
        <Badge variant="secondary" className="ml-2 text-xs px-2 py-0">Aptos Mainnet</Badge>
      </div>

      {activeTab === 'dashboard' && (
        <div className="flex flex-col flex-1 px-3 bg-[#121212]">

          <Card className="mb-2 bg-[#1A1A2E] border-[#2A2A4E]">
            <CardHeader className="p-2 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center">
                  <Wallet className="h-3.5 w-3.5 mr-1.5 text-[#9D5CFF]" />
                  Connected Wallet
                </CardTitle>
                <Badge variant="accent" className="animate-pulse text-xs">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-[#A0A0A0] bg-[#121212] px-2 py-0.5 rounded-md">
                  {shortAddress}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 text-[#00E5FF] hover:bg-[#00E5FF]/10"
                  onClick={() => copyToClipboard(walletAddress)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <Card className="bg-[#1A1A2E] border-[#2A2A4E]">
              <CardContent className="p-2">
                <div className="text-xs text-[#A0A0A0]">Active Contracts</div>
                <div className="text-lg font-bold text-[#00E5FF]">{contractMetrics.active}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-[#1A1A2E] border-[#2A2A4E]">
              <CardContent className="p-2">
                <div className="text-xs text-[#A0A0A0]">Archived Contracts</div>
                <div className="text-lg font-bold text-[#9D5CFF]">{contractMetrics.archived}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-2 bg-[#1A1A2E] border-[#2A2A4E]">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <DualMetricGraph />
            </CardContent>
          </Card>

          <Card className="mb-2 bg-[#1A1A2E] border-[#2A2A4E] flex-1">
            <CardHeader className="p-2 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Recent Activity</CardTitle>
                <div className="text-xs text-[#A0A0A0]">{recentActivity.length} ops</div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto" style={{ maxHeight: "100px" }}>
              <div className="space-y-0">
                {recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between px-2 py-1 border-b border-[#2A2A4E] last:border-0 hover:bg-[#2A2A4E]/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      {renderIcon(item.icon)}
                      <div>
                        <div className="text-xs font-medium">{item.name}</div>
                        <div className="text-[9px] text-[#A0A0A0]">{item.time}</div>
                      </div>
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full mt-auto mb-2 flex items-center gap-2 bg-[#00E5FF] hover:bg-[#00E5FF]/80 text-[#121212] font-medium" 
            onClick={() => openMainApp('')}
          >
            Open Dashboard
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="flex flex-col flex-1 px-3 bg-[#121212]">
          <Card className="mb-2 bg-[#1A1A2E] border-[#2A2A4E] flex-1">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm">Contract Library</CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 pt-1 overflow-y-auto" style={{ maxHeight: "290px" }}>
              
              <div className="mb-2 bg-[#121212]/50 rounded-md p-1.5">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="text-[9px] text-[#A0A0A0]">Contract Activity</div>
                  <div className="text-[9px] text-[#00E5FF]">April 5-11, 2025</div>
                </div>
                <WeekBarChart valueKey="contracts" color="#00E5FF" />
              </div>
              
            
              <div className="mb-2 bg-[#121212]/50 rounded-md p-1.5">
                <HourlyLineGraph />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-[#121212]/50 rounded-md p-1.5">
                  <div className="text-[9px] text-[#A0A0A0]">Deployed</div>
                  <div className="text-base font-bold text-[#00E5FF]">{contractMetrics.active}</div>
                </div>
                <div className="bg-[#121212]/50 rounded-md p-1.5">
                  <div className="text-[9px] text-[#A0A0A0]">Success Rate</div>
                  <div className="text-base font-bold text-[#39D98A]">{contractMetrics.successRate}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#00E5FF]/10 p-1.5 mb-0.5">
                    <FileContract className="h-3.5 w-3.5 text-[#00E5FF]" />
                  </div>
                  <div className="text-xs font-medium">Contract Mgmt</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Browse & deploy</div>
                </div>
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#39D98A]/10 p-1.5 mb-0.5">
                    <Shield className="h-3.5 w-3.5 text-[#39D98A]" />
                  </div>
                  <div className="text-xs font-medium">Security Audit</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Vulnerability scan</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button 
            className="w-full mt-auto mb-2 flex items-center gap-2 bg-[#00BFA5] hover:bg-[#00BFA5]/80 text-[#121212] font-medium" 
            onClick={() => openMainApp('contracts')}
          >
            Open Contract Library
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="flex flex-col flex-1 px-3 bg-[#121212]">
          <Card className="mb-2 bg-[#1A1A2E] border-[#2A2A4E] flex-1">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm">Archived Contracts</CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 pt-1 overflow-y-auto" style={{ maxHeight: "290px" }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-[#121212]/50 rounded-md p-1.5">
                  <div className="text-[9px] text-[#A0A0A0]">Archived</div>
                  <div className="text-base font-bold text-[#9D5CFF]">{contractMetrics.archived}</div>
                </div>
                <div className="bg-[#121212]/50 rounded-md p-1.5">
                  <div className="text-[9px] text-[#A0A0A0]">Last Archived</div>
                  <div className="text-base font-bold text-[#A0A0A0]">3Hrs ago</div>
                </div>
              </div>
              
              <div className="bg-[#121212]/50 rounded-md p-1.5 mb-2">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="text-[9px] text-[#A0A0A0]">Archives Over Time</div>
                  <div className="text-[9px] text-[#9D5CFF]">April 5-11, 2025</div>
                </div>
                <WeekBarChart valueKey="archived" color="#9D5CFF" />
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#9D5CFF]/10 p-1.5 mb-0.5">
                    <Archive className="h-3.5 w-3.5 text-[#9D5CFF]" />
                  </div>
                  <div className="text-xs font-medium">Archive Mgmt</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Restore or delete</div>
                </div>
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#FF5252]/10 p-1.5 mb-0.5">
                    <Server className="h-3.5 w-3.5 text-[#FF5252]" />
                  </div>
                  <div className="text-xs font-medium">Version History</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Compare contracts</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button 
            className="w-full mt-auto mb-2 flex items-center gap-2 bg-[#9D5CFF] hover:bg-[#9D5CFF]/80 text-[#121212] font-medium" 
            onClick={() => openMainApp('archive')}
          >
            Open Archives
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {activeTab === 'playground' && (
        <div className="flex flex-col flex-1 px-3 bg-[#121212]">
          <Card className="mb-2 bg-[#1A1A2E] border-[#2A2A4E] flex-1">
            <CardHeader className="p-2 pb-1">
              <CardTitle className="text-sm">Code Playground</CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 pt-1 overflow-y-auto" style={{ maxHeight: "290px" }}>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#FFC107]/10 p-1.5 mb-0.5">
                    <Code className="h-3.5 w-3.5 text-[#FFC107]" />
                  </div>
                  <div className="text-xs font-medium">Move Editor</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Syntax highlight</div>
                </div>
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#00E5FF]/10 p-1.5 mb-0.5">
                    <Activity className="h-3.5 w-3.5 text-[#00E5FF]" />
                  </div>
                  <div className="text-xs font-medium">Gas Estimation</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Cost calculation</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#39D98A]/10 p-1.5 mb-0.5">
                    <Terminal className="h-3.5 w-3.5 text-[#39D98A]" />
                  </div>
                  <div className="text-xs font-medium">Auto-completion</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">AI-powered</div>
                </div>
                <div className="bg-[#121212]/50 rounded-md p-1.5 flex flex-col items-center">
                  <div className="rounded-full bg-[#9D5CFF]/10 p-1.5 mb-0.5">
                    <Shield className="h-3.5 w-3.5 text-[#9D5CFF]" />
                  </div>
                  <div className="text-xs font-medium">Security Scan</div>
                  <div className="text-[9px] text-[#A0A0A0] text-center">Real-time checks</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button 
            className="w-full mt-auto mb-2 flex items-center gap-2 bg-[#FFC107] hover:bg-[#FFC107]/80 text-[#121212] font-medium" 
            onClick={() => openMainApp('editor')}
          >
            Open Playground
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between h-16 px-2 mt-auto bg-[#1A1A2E] border-t border-[#2A2A4E] rounded-b-lg">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center w-16 pt-1 ${activeTab === 'dashboard' ? 'text-[#00E5FF]' : 'text-[#A0A0A0] hover:text-white'}`}
        >
          <Home className="h-6 w-6 mb-0.5" />
          <span className="text-xs font-extrabold">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('contracts')}
          className={`flex flex-col items-center justify-center w-16 pt-1 ${activeTab === 'contracts' ? 'text-[#00BFA5]' : 'text-[#A0A0A0] hover:text-white'}`}
        >
          <FileContract className="h-6 w-6 mb-0.5" />
          <span className="text-xs font-extrabold">Contracts</span>
        </button>
        <button 
          onClick={() => setActiveTab('archive')}
          className={`flex flex-col items-center justify-center w-16 pt-1 ${activeTab === 'archive' ? 'text-[#9D5CFF]' : 'text-[#A0A0A0] hover:text-white'}`}
        >
          <Archive className="h-6 w-6 mb-0.5" />
          <span className="text-xs font-extrabold">Archive</span>
        </button>
        <button 
          onClick={() => setActiveTab('playground')}
          className={`flex flex-col items-center justify-center w-16 pt-1 ${activeTab === 'playground' ? 'text-[#FFC107]' : 'text-[#A0A0A0] hover:text-white'}`}
        >
          <Code className="h-6 w-6 mb-0.5" />
          <span className="text-xs font-extrabold">Code</span>
        </button>
      </div>
    </div>
  )
}

export default App
