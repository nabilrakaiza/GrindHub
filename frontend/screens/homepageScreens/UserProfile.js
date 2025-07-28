import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GrindHubHeader from './components/GrindHubHeader';
import GrindHubFooter from './components/GrindHubFooter';
import { jwtDecode } from "jwt-decode";
import { AuthContext } from '../AuthContext';

const UserProfile = ({navigation}) => {

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

  const [user, setUser] = useState(null); // Changed to null initially
  const [notifications, setNotifications] = useState({
    notifications: true,
    taskDeadline: true,
    lectureClass: true,
    groupMessages: true,
    privateMessages: true
  });

  const getUser = async ({userid}) => {
    try {
      const response = await fetch("https://grindhub-production.up.railway.app/api/auth/getUser", {
        method : "POST",
        headers : { 'Content-Type': 'application/json' },
        body : JSON.stringify({
          userid : userid,
        }),
      });
      const data = await response.json();
      if (data.success == false){
        return null;
      }
      // Assuming existingUser is an array with one user object
      return data.existingUser[0]; 
    }
    catch (error){
      console.error(error);
      return null;
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const fetchedUser = await getUser({ userid : userid});
        if (fetchedUser) {
          setUser(fetchedUser);

          // Map the fetched user data to the notification state shape
          const notificationSettings = {
            notifications: fetchedUser.notification,
            taskDeadline: fetchedUser.tasknotification,
            lectureClass: fetchedUser.classnotification,
            groupMessages: fetchedUser.groupnotification,
            privateMessages: fetchedUser.privatenotification
          };
          setNotifications(notificationSettings);
        }
      } catch (err) {
        console.error("Error in fetchUserData:", err);
      }
    };
    fetchUserData();
  }, []);

  // This function now updates the UI instantly and sends the change to the backend.
  const toggleNotification = async (key) => {
    // 1. Optimistic UI Update: Update the state immediately for a responsive feel.
    const newValue = !notifications[key];
    setNotifications(prev => ({
      ...prev,
      [key]: newValue
    }));

    // 2. Persist to Database: Call the backend to save the change.
    if (!user || !user.userid) {
        console.error("Cannot update notification: user not loaded.");
        // Optional: revert the UI change here if needed
        return;
    }

    try {
        const response = await fetch("https://grindhub-production.up.railway.app/api/auth/updateUser", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userid: user.userid,
                field: key,
                value: newValue
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log(`Successfully updated '${key}' to ${newValue}`);
        } else {
            console.error(`Failed to update '${key}':`, data.message);
            // Optional: Revert the UI change on failure
            setNotifications(prev => ({ ...prev, [key]: !newValue }));
        }
    } catch (error) {
        console.error("API error updating notification:", error);
        // Optional: Revert the UI change on failure
        setNotifications(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Sign Out Cancelled"),
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              await signOut(); // Call the signOut function from AuthContext
              // AuthContext will handle navigation to LoginScreen
              console.log("User signed out successfully.");
            } catch (error) {
              console.error("Error during sign out:", error);
              Alert.alert("Sign Out Failed", "There was an issue signing you out. Please try again.");
            }
          },
          style: "destructive" // Red color for destructive action on iOS
        }
      ],
      { cancelable: true }
    );
  };

  const menuItems = [
    { title: 'Status Message', icon: 'chevron-forward' },
    { title: 'Change Username', icon: 'chevron-forward' }
  ];

  const notificationItems = [
    { key: 'notifications', title: 'Notifications' },
    { key: 'taskDeadline', title: 'Task Deadline' },
    { key: 'lectureClass', title: 'Lecture / Class' },
    { key: 'groupMessages', title: 'Group Messages' },
    { key: 'privateMessages', title: 'Private Messages' }
  ];

  const ToggleSwitch = ({ isOn, onToggle }) => (
    <TouchableOpacity
      style={[ styles.toggleSwitch, { backgroundColor: isOn ? '#FF8C42' : '#9CA3AF' } ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View
        style={[ styles.toggleThumb, { transform: [{ translateX: isOn ? 20 : 2 }] } ]}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FF8C42" barStyle="dark-content" />
      <GrindHubHeader navigation={navigation}/>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.profilePicture} />
          <Text style={styles.username}>{user ? user.username : ''}</Text>
        </View>

        {/* <View style={styles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[ styles.menuItem, index !== menuItems.length - 1 && styles.menuItemBorder ]}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>{item.title}</Text>
              <Ionicons name={item.icon} size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View> */}

        {/* <View style={styles.card}>
          {notificationItems.map((item, index) => (
            <View
              key={index}
              style={[ styles.notificationItem, index !== notificationItems.length - 1 && styles.notificationItemBorder ]}
            >
              <Text style={styles.notificationText}>{item.title}</Text>
              <ToggleSwitch
                isOn={notifications[item.key]} 
                onToggle={() => toggleNotification(item.key)}
              />
            </View>
          ))}
        </View> */}

        <TouchableOpacity style={styles.signOutCard} activeOpacity={0.7} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FED7AA',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4F46E5',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#06B6D4',
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemText: {
    fontSize: 18,
    color: '#374151',
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  notificationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationText: {
    fontSize: 18,
    color: '#374151',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  signOutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  signOutText: {
    fontSize: 18,
    color: '#374151',
  },
  bottomSpacing: {
    height: 10,
  }
});

export default UserProfile;
