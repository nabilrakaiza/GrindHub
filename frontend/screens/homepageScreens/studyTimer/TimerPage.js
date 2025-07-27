import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { jwtDecode } from "jwt-decode";
import { AuthContext } from '../../AuthContext';

import GrindHubFooter from '../components/GrindHubFooter';
import GrindHubHeader from '../components/GrindHubHeader';

export default function TimerPage({ navigation }) {
  const { userToken, signOut } = useContext(AuthContext);
  // Decode token to get userid
  const decodedToken = useMemo(() => {
    if (userToken) {
      try {
        return jwtDecode(userToken);
      } catch (e) {
        console.error("Failed to decode token in ChatScreen:", e);
        // If token is invalid, sign out the user
        signOut();
        return null;
      }
    }
    return null;
  }, [userToken, signOut]);

  // Derive userid and username from the decoded token
  const userid = decodedToken?.userid;
  // const route = useRoute();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRunning, setIsRunning] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [moduleTimes, setModuleTimes] = useState({});
  const [taskTimes, setTaskTimes] = useState({});

  const [modules, setModules] = useState([]);

  useEffect(() => {
    const fetchModulesAndAssignments = async () => {
      try {
        const [moduleRes, assignmentRes] = await Promise.all([
          fetch('https://grindhub-production.up.railway.app/api/auth/getModule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid }),
          }),
          fetch('https://grindhub-production.up.railway.app/api/auth/getAssignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid }),
          }),
        ]);
  
        if (!moduleRes.ok || !assignmentRes.ok) {
          console.error('❌ Error with response:', moduleRes.status, assignmentRes.status);
          return;
        }
  
        const moduleData = await moduleRes.json();
        const assignmentData = await assignmentRes.json();
  
        if (!moduleData.success || !assignmentData.success) {
          console.error('❌ Failed response:', moduleData.message, assignmentData.message);
          return;
        }
  
        // Build a map from moduleCode to object
        const moduleMap = {};
        moduleData.modules.forEach((mod) => {
          moduleMap[mod.modulename] = {
            code: mod.modulename,
            time: 0,
            tasks: [],
          };
        });
  
        // Fill the tasks from assignments
        assignmentData.assignments.forEach((assign) => {
          const modCode = assign.assignmentmodule;
          if (!moduleMap[modCode]) {
            // In case module doesn't exist from module table
            moduleMap[modCode] = {
              code: modCode,
              time: 0,
              tasks: [],
            };
          }
          moduleMap[modCode].tasks.push(assign.assignmentname);
        });
  
        const modules = Object.values(moduleMap);
        setModules(modules);
      } catch (err) {
        console.error('❌ Error fetching modules or assignments:', err);
      }
    };
  
    if (userid) {
      fetchModulesAndAssignments();
    }
  }, [userid]);
  
  

  

  // Calculate total time from all modules
  const totalTime = modules.reduce((sum, module) => sum + module.time, 0);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        if (activeTimer?.type === 'module' || activeTimer?.type === 'task') {
          setModules(prevModules => 
            prevModules.map(module => 
              module.code === activeTimer.moduleCode 
                ? {...module, time: module.time + 1}
                : module
            )
          );
        }
        
        if (activeTimer?.type === 'task') {
          setTaskTimes(prev => {
            const key = `${activeTimer.moduleCode}-${activeTimer.taskName}`;
            return {...prev, [key]: (prev[key] || 0) + 1};
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  const handleStartPress = (moduleCode, taskName = null) => {

    const modules = getModules(userid)

    console.log("hihi")
    console.log(modules)
    console.log("haha")

    // Determine what timer we're dealing with
    const timerType = !moduleCode ? 'main' : taskName ? 'task' : 'module';
    
    // Check if this is the currently active timer
    const isActiveTimer = (
      (timerType === 'main' && activeTimer?.type === 'main') ||
      (timerType === 'module' && activeTimer?.type === 'module' && activeTimer.moduleCode === moduleCode) ||
      (timerType === 'task' && activeTimer?.type === 'task' && activeTimer.moduleCode === moduleCode && activeTimer.taskName === taskName)
    );
    
    if (isActiveTimer) {
      // Stop the current timer
      setIsRunning(false);
      setActiveTimer(null);
      return;
    }
    
    // Start new timer
    setIsRunning(true);
    if (timerType === 'task') {
      setActiveTimer({type: 'task', moduleCode, taskName});
    } else if (timerType === 'module') {
      setActiveTimer({type: 'module', moduleCode});
    } else {
      setActiveTimer({type: 'main'});
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDayMonthString = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = days[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${dayName}, ${day}/${month}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f58220" barStyle="light-content" />

      <GrindHubHeader navigation={navigation}/>

      <View style={styles.timeContainer}>
        <Text style={styles.date}>{getDayMonthString(currentTime)}</Text>
        <Text style={styles.clock}>
          {currentTime.toLocaleTimeString('en-US', {hour12: false})}
        </Text>
      </View>

      {/* Main Timer Display */}
      <View style={styles.mainTimerContainer}>
        <Text style={styles.mainTimerLabel}>Total Study Time</Text>
        <Text style={styles.mainTimer}>
          {formatTime(totalTime)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {modules.map((mod, i) => (
          <View key={i} style={styles.moduleContainer}>
            {/* Module Header Card */}
            <View style={[
              styles.moduleCard,
              activeTimer?.moduleCode === mod.code && activeTimer?.type === 'module' && styles.activeTimer
            ]}>
              <View style={styles.moduleHeader}>
                <TouchableOpacity 
                  onPress={() => handleStartPress(mod.code)}
                  style={styles.playButton}
                >
                  <Ionicons 
                    name={activeTimer?.moduleCode === mod.code && activeTimer?.type === 'module' ? "pause" : "play"} 
                    size={24} 
                    color={activeTimer?.moduleCode === mod.code && activeTimer?.type === 'module' ? "#fff" : "#000"} 
                  />
                </TouchableOpacity>
                <Text style={[
                  styles.moduleCode,
                  activeTimer?.moduleCode === mod.code && activeTimer?.type === 'module' && styles.activeText
                ]}>
                  {mod.code}
                </Text>
                <Text style={[
                  styles.timeSpent,
                  activeTimer?.moduleCode === mod.code && activeTimer?.type === 'module' && styles.activeText
                ]}>
                  {formatTime(mod.time)}
                </Text>
              </View>
            </View>

            {/* Task List */}
            {mod.tasks.map((task, j) => {
              const taskKey = `${mod.code}-${task}`;
              const taskTime = taskTimes[taskKey] || 0;
              const isActive = activeTimer?.moduleCode === mod.code && activeTimer?.taskName === task;
              
              return (
                <View key={j} style={[
                  styles.taskCard,
                  isActive && styles.activeTimer
                ]}>
                  <View style={styles.taskRow}>
                    <TouchableOpacity 
                      onPress={() => handleStartPress(mod.code, task)}
                      style={styles.playButton}
                    >
                      <Ionicons 
                        name={isActive ? "pause" : "play"} 
                        size={20} 
                        color={isActive ? "#fff" : "#000"} 
                      />
                    </TouchableOpacity>
                    <Text style={[
                      styles.taskName,
                      isActive && styles.activeText
                    ]}>
                      {task}
                    </Text>
                    <Text style={[
                      styles.timeSpent,
                      isActive && styles.activeText,
                      {fontSize: 14}
                    ]}>
                      {formatTime(taskTime)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fdf6f0' 
  },
  timeContainer: { 
    alignItems: 'center', 
    marginVertical: 15,
    marginBottom: 10 
  },
  date: { 
    fontSize: 16, 
    color: '#555',
    marginBottom: 5
  },
  clock: { 
    fontSize: 42,
    fontWeight: 'bold', 
    color: '#333',
    fontFamily: 'Helvetica Neue',
    letterSpacing: 1
  },
  mainTimerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffd733',
    borderRadius: 12,
    marginHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainTimerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 5,
  },
  mainTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContainer: { 
    paddingHorizontal: 20, 
    paddingBottom: 100 
  },
  moduleContainer: {
    marginBottom: 15,
  },
  moduleCard: {
    backgroundColor: '#ffd733',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    zIndex: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskCard: {
    backgroundColor: '#ffd733',
    marginLeft: 20,
    marginRight: 10,
    padding: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 0,
    marginTop: -5,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    padding: 6,
    marginRight: 5,
  },
  moduleCode: { 
    fontWeight: '800', 
    fontSize: 20, 
    marginLeft: 10, 
    flex: 1,
    color: '#333'
  },
  timeSpent: { 
    fontWeight: '800',
    fontSize: 18,
    color: '#333'
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskName: { 
    marginLeft: 12, 
    fontSize: 16, 
    flex: 1,
    color: '#333'
  },
  activeTimer: {
    backgroundColor: '#f58220',
  },
  activeText: {
    color: '#fff',
  },
});