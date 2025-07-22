import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import {
  View,
  Text, // Keep Text imported
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GrindHubHeader from './components/GrindHubHeader';
import { jwtDecode } from "jwt-decode";
import io from 'socket.io-client';

import { AuthContext } from '../AuthContext'; // Adjust the path to your AuthContext.js file

const FreeTimeCard = () => (
  <View style={styles.scheduleItem}>
    <View style={styles.scheduleItemLeft}>
      <Text style={styles.scheduleItemText}>
        You don't have anything to do!
      </Text>
    </View>
  </View>
);

const SOCKET_SERVER_URL = 'https://grindhubchatbot-production.up.railway.app';

// Moved the comment directly above the export default function
// Removed 'route' prop comment from the function line to prevent misinterpretation
export default function HomePage({ navigation }) {
  const { userToken, signOut } = useContext(AuthContext); // Get userToken and signOut from AuthContext

  // Decode token from context
  const decodedToken = useMemo(() => {
    if (userToken) {
      try {
        return jwtDecode(userToken);
      } catch (e) {
        console.error("Failed to decode token:", e);
        // Handle token decoding error, maybe sign out user
        signOut();
        return null;
      }
    }
    return null;
  }, [userToken, signOut]);

  // Derive userid from decoded token
  const userid = decodedToken?.userid; // Use optional chaining to safely access userid

  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [username, setUsername] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const todayDate = new Date(today);
    todayDate.setDate(today.getDate());
    todayDate.setHours(0, 0, 0, 0);
    return todayDate;
  });

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollViewRef = useRef();

  // Initialize socket only if userToken (and thus userid) is available
  const socket = useMemo(() => {
    if (userid) {
      const newSocket = io(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        forceNew: true,
      });
      return newSocket;
    }
    return null; // Return null if userid is not available
  }, [userid]); // Depend on userid

  useEffect(() => {
    if (!socket) return; // Don't setup listeners if socket is null

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server!');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server!');
    });

    socket.on('chat_message', (msg) => {
      console.log('Received message:', msg);
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('chat_message');
      socket.off('connect_error');
      socket.disconnect(); // Disconnect socket when component unmounts or socket changes
    };
  }, [socket]);

  useEffect(() => {
    if (chatScrollViewRef.current) {
      chatScrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = () => {
    if (chatInput.trim() && socket) { // Ensure socket exists before sending
      const userMessage = { sender: 'User', message: chatInput.trim() };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      socket.emit('user_message', { message: chatInput.trim(), context:messages});
      setChatInput('');
    }
  };

  const getDateKey = (isoString) => isoString.substring(0, 10);

  const formatSectionDate = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const day = date.getDate();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    const formatted = date.toLocaleDateString('en-GB', options).replace(/(\d+)/, `$1${suffix}`);
    return formatted;
  };

  const formatTime = (isoString) => { // This function might not be used, check usage
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  function formatTimeToHHMM(dateInput, timeZone = "Asia/Singapore") {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const options = {
      timeZone: timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleTimeString('en-GB', options);
  }

  const getAssignments = async (currentUserId) => { // Accepts userid as parameter
    try {
      const response = await fetch("https://grindhub-production.up.railway.app/api/auth/getAssignments", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: currentUserId }),
      });
      const data = await response.json();
      return data.success ? data.assignments : [];
    } catch (error) {
      console.error("Error fetching assignments:", error);
      return [];
    }
  };

  const getClass = async (currentUserId) => { // Accepts userid as parameter
    try {
      const response = await fetch("https://grindhub-production.up.railway.app/api/auth/getClass", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: currentUserId }),
      });
      const data = await response.json();
      return data.success ? data.classes : [];
    } catch (error) {
      console.error("Error fetching classes:", error);
      return [];
    }
  };

  useEffect(() => {
    // Only fetch data if userid is available
    if (!userid) {
        setIsLoading(false); // If no userid, ensure loading is off
        return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedAssignments, fetchedClasses, groupsData, userData] = await Promise.all([
          getAssignments(userid), // Pass userid
          getClass(userid),       // Pass userid
          fetch("https://grindhub-production.up.railway.app/api/auth/getGroups", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid: userid }),
          }).then(res => res.json()),
          fetch(`https://grindhub-production.up.railway.app/api/auth/getUser`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid: userid }),
          }).then(res => res.json()),
        ]);

        setAssignments(fetchedAssignments);
        setClasses(fetchedClasses);
        setCombinedData(combineAndExtract(fetchedClasses, fetchedAssignments));

        if (groupsData.success) {
          setGroups(groupsData.groups);
        } else if (groupsData.message !== "No groups found!") {
          console.error("Failed to fetch groups:", groupsData.message);
        }

        if (userData.success) {
          setUsername(userData.existingUser[0].username);
        } else {
          console.error("Failed to fetch username:", userData.message);
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userid]); // Depend on userid. Data refetches if userid changes.

  function combineAndExtract(classesArray, assignmentsArray) {
    const extractedClasses = classesArray.map(classItem => ({
      module_code: classItem.modulename,
      name: classItem.classtype,
      type: classItem.classtype,
      location: classItem.classlocation,
      date: classItem.startdate,
      time: classItem.starttime,
      percentage: null
    }));

    const extractedAssignments = assignmentsArray.map(assignmentItem => ({
      module_code: assignmentItem.assignmentmodule,
      name: assignmentItem.assignmentname,
      type: "Assignment",
      location: null,
      date: assignmentItem.assignmentduedate,
      time: assignmentItem.assignmenttimeduedate,
      percentage: assignmentItem.assignmentpercentage
    }));

    const combinedList = [...extractedClasses, ...extractedAssignments];

    combinedList.sort((a, b) => {
      // Assuming 'date' is a full ISO string or similar that can be directly compared
      // and 'time' is part of it or secondary sort. If 'time' is just "HH:MM",
      // you need to combine date and time for proper comparison.
      // For now, if date includes time, just comparing new Date(a.date) is sufficient.
      // If 'time' is a separate "HH:MM", you'd need to construct a full Date object.
      // Given your formatTimeToHHMM, it seems 'date' might be sufficient for sorting.
      return new Date(a.date) - new Date(b.date);
    });

    return combinedList;
  }

  const groupedEvents = useMemo(() => {
    // Sort by date first, then by time within the same date
    const sorted = [...combinedData].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        // Compare dates
        if (dateA.toDateString() !== dateB.toDateString()) {
            return dateA.getTime() - dateB.getTime();
        }

        // If dates are the same, compare times
        // Assuming time is also part of the date string or can be combined
        const timeA = new Date(`${a.date}T${a.time}`); // Combine date and time for robust comparison
        const timeB = new Date(`${b.date}T${b.time}`);
        return timeA.getTime() - timeB.getTime();
    });

    return sorted.reduce((acc, event) => {
      const dateKey = getDateKey(event.date);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {});
  }, [combinedData]);

  const renderEventCard = (event, index) => {
    return (
      <View key={index} style={styles.scheduleItem}>
        <View style={styles.scheduleItemLeft}>
          <Text style={styles.scheduleItemText}>
            {event.module_code} - {event.name}
            {event.location && ` - ${event.location}`}
          </Text>
        </View>
        <Text style={styles.scheduleTime}>{formatTimeToHHMM(event.date)}</Text>
      </View>
    );
  };

  const renderDays = ({ todayDate }) => {
    const days = [];
    const numberOfDaysToShow = 1;

    for (let i = 0; i < numberOfDaysToShow; i++) {
      const currentDate = new Date(todayDate);
      currentDate.setDate(todayDate.getDate() + i);

      const dateKey = getDateKey(currentDate.toISOString());
      const eventsForDay = groupedEvents[dateKey] || [];

      days.push(
        <View key={dateKey}>
          {eventsForDay.length > 0
            ? eventsForDay.map(renderEventCard)
            : <FreeTimeCard />}
        </View>
      );
    }
    return days;
  };

  const leftArrowPressed = () => {
    setStartDate(startDate => {
      const newDay = new Date(startDate);
      newDay.setDate(startDate.getDate() - 1);
      return newDay;
    });
  };

  const rightArrowPressed = () => {
    setStartDate(startDate => {
      const newDay = new Date(startDate);
      newDay.setDate(startDate.getDate() + 1);
      return newDay;
    });
  };

  const [activeTimer, setActiveTimer] = useState(null);

  const startTimer = (type) => {
    setActiveTimer(type);
    // You might want to navigate to the TimerPage here or trigger actual timer logic
    navigation.navigate('TimerPage'); // Navigate to timer page if it's meant to be full-screen
  };

  const ProgressBar = ({ progress }) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progress}%`,
              backgroundColor: progress >= 50 ? '#10B981' : '#22C55E'
            }
          ]}
        />
      </View>
      <Text style={styles.progressText}>{progress}% Completed</Text>
    </View>
  );

  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedToday = startDate.toLocaleDateString('en-US', options);

  // If isLoading or userid is null, show a full-screen loading indicator
  if (isLoading || !userid) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FF8400" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8400" />
          <Text style={{ marginTop: 10, color: "#FF8400" }}>Loading your GrindHub...</Text>
        </View>
      </SafeAreaView>
    );
  } else {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FF8400" barStyle="light-content" />

        {/* Removed token prop from GrindHubHeader and GrindHubFooter.
            They should also consume AuthContext directly if they need userToken/userid. */}
        <GrindHubHeader navigation={navigation} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>Hello, {username}!</Text>
            <Ionicons name="search-outline" size={24} color="#374151" />
          </View>

          {/* Schedule Card */}
          <View style={[styles.card]}>
            <View style={styles.container2}>
              <TouchableOpacity onPress={leftArrowPressed}>
                <Image
                  source={require("../../assets/Arrow to left.png")}
                  style={styles.arrowIcon}
                />
              </TouchableOpacity>
              <Text style={styles.dateText}>{formattedToday}</Text>
              <TouchableOpacity onPress={rightArrowPressed}>
                <Image
                  source={require("../../assets/Arrow to right.png")}
                  style={styles.arrowIcon}
                />
              </TouchableOpacity>
            </View>
            {renderDays({ todayDate: startDate })}
          </View>

          {/* Study Timer */}
          <TouchableOpacity onPress={() => navigation.navigate('TimerPage')}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Study Timer</Text>
              <View style={styles.timerButtons}>
                {/* These buttons could trigger specific timer settings or just navigate */}
                <TouchableOpacity
                  style={[
                    styles.timerButton,
                    activeTimer === 'CS2030' && styles.timerButtonActive
                  ]}
                  onPress={() => startTimer('CS2030')}
                >
                  <Text style={[
                    styles.timerButtonText,
                    activeTimer === 'CS2030' && styles.timerButtonTextActive
                  ]}>
                    Start CS2030 Timer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timerButton,
                    activeTimer === 'Other' && styles.timerButtonActive
                  ]}
                  onPress={() => startTimer('Other')}
                >
                  <Text style={[
                    styles.timerButtonText,
                    activeTimer === 'Other' && styles.timerButtonTextActive
                  ]}>
                    Start Other Timer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>


          {/* Your Groups */}
          {/* No need to pass token via params anymore */}
          <TouchableOpacity onPress={() => navigation.navigate("GroupChat")}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Groups</Text>
              <View style={styles.groupsList}>
                {groups.map((group, index) => (
                  <View key={index} style={styles.groupItem}>
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupName}>{group.groupname}</Text>
                    </View>
                    <View style={styles.groupMessage}>
                      <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                      <Text style={styles.groupMessageText}>this is a subtitle (not yet implemented)</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          {/* Your Assignments */}
          {/* No need to pass token via params anymore */}
          <TouchableOpacity
            onPress={() => navigation.navigate('TrackerPage')}
            activeOpacity={0.7}
          >
            <View style={[styles.card, styles.lastCard]}>
              <Text style={styles.cardTitle}>Your Assignments</Text>
              <View style={styles.assignmentsList}>
                {assignments.length > 0 ? (
                  assignments.map((assignment, index) => (
                    <View key={index} style={styles.assignmentItem}>
                      <View style={styles.assignmentHeader}>
                        <Text style={styles.assignmentTitle}>
                          {assignment.assignmentmodule} - {assignment.assignmentname}
                        </Text>
                        <Text style={styles.assignmentDue}>
                          Due {formatTimeToHHMM(assignment.assignmentduedate)}
                        </Text>
                      </View>
                      <ProgressBar progress={assignment.assignmentpercentage} />
                    </View>
                  ))
                ) : (
                  <View style={styles.noAssignmentsView}>
                    <Text style={styles.noAssignmentsText}>
                      No assignments at the moment!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal for "Add" functionality */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={addModalVisible}
          onRequestClose={() => setAddModalVisible(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setAddModalVisible(false)}>
            <View style={styles.modalView}>
              <View style={styles.innerContainer}>
                {/* No need to pass token via params anymore */}
                <TouchableOpacity style={styles.itemBox} onPress={() => { setAddModalVisible(false); navigation.navigate("AddingModule") }}>
                  <Text style={styles.itemText}>Add Module</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemBox} onPress={() => { setAddModalVisible(false); navigation.navigate("AddingClass") }}>
                  <Text style={styles.itemText}>Add Class</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemBox} onPress={() => { setAddModalVisible(false); navigation.navigate("AddingAssignment") }}>
                  <Text style={styles.itemText}>Add Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* New Modal for Chatbot */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={chatModalVisible}
          onRequestClose={() => setChatModalVisible(false)}>

          <View style={styles.chatModalOverlay}>
            {/* Background touchable area to close modal */}
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setChatModalVisible(false)}
            />

            {/* Main modal content - NOT wrapped in Pressable */}
            <View style={styles.chatModalContainer}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>GrindHub Chatbot</Text>
                <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.chatContent}
                ref={chatScrollViewRef}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? "interactive" : "on-drag"}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {messages.map((msg, index) => (
                  <View
                    key={index}
                    style={msg.sender === 'Bot' ? styles.chatMessageBot : styles.chatMessageUser}
                  >
                    <Text style={styles.chatMessageText}>{msg.message}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatTextInput}
                  placeholder="Type your message..."
                  placeholderTextColor="#6B7280"
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
                <TouchableOpacity style={styles.chatSendButton} onPress={sendMessage}>
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.fab}>
          <View style={styles.fabContainer}>
            <TouchableOpacity style={styles.fabButton} onPress={() => setChatModalVisible(true)}>
              <Ionicons name="chatbubble" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fabButtonDark}
              onPress={() => { setAddModalVisible(true) }}
            >
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FED7AA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FED7AA', // Match background color
  },
  container2: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f2f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginHorizontal: 26,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  card: {
    backgroundColor: '#FFA333',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  lastCard: {
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  scheduleList: {
    gap: 12,
  },
  scheduleItem: {
    backgroundColor: '#FFD93D',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8, // Added margin for better spacing between schedule items
  },
  scheduleItemLeft: {
    flex: 1,
  },
  scheduleItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 10, // Added margin for spacing between text and time
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  timerButton: {
    flex: 1,
    backgroundColor: '#FFD93D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#F97316',
  },
  timerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  timerButtonTextActive: {
    color: 'white',
  },
  groupsList: {
    gap: 12,
  },
  groupItem: {
    backgroundColor: '#FFD93D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 5, // Added margin for better spacing between group items
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  groupTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  groupMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupMessageText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
    flex: 1,
  },
  assignmentsList: {
    gap: 12,
  },
  assignmentItem: {
    backgroundColor: '#FFD93D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8, // Added margin for better spacing between assignment items
  },
  assignmentHeader: {
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  assignmentDue: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
  },
  fabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 8,
  },
  fabButton: {
    width: 32,
    height: 32,
    backgroundColor: '#EA580C',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButtonDark: {
    width: 32,
    height: 32,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  modalView: {
    bottom: 30,
    width: 'auto',
    minWidth: 150,
    marginBottom: 120,
    marginRight: 15,
    backgroundColor: '#f5f1e9',
    borderRadius: 25,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  innerContainer: {
    width: '100%',
    backgroundColor: '#eae6db',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  itemBox: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFA333',
    borderRadius: 20,
    marginVertical: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noAssignmentsView: {
    backgroundColor: '#FFD93D',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAssignmentsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  // --- CHAT MODAL STYLES ---
  chatModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    width: '100%',
    flexDirection: 'column',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginRight: 10,
    marginLeft: 10,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  chatContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    maxHeight: undefined,
  },
  chatMessageBot: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  chatMessageUser: {
    backgroundColor: '#DCF8C6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  chatMessageText: {
    fontSize: 14,
    color: '#1F2937',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  chatSendButton: {
    backgroundColor: '#F97316',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});