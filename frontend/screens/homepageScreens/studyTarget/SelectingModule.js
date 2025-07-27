import React, {useContext, useMemo, useState, useEffect} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GrindHubFooter from '../components/GrindHubFooter';
import GrindHubHeader from '../components/GrindHubHeader';
import { useRoute } from '@react-navigation/native';
import { jwtDecode } from "jwt-decode";
import { AuthContext } from '../../AuthContext';

export default function SelectingModule({ navigation }) {
  // const route = useRoute();

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

  const [modules, setModules] = useState([]);

useEffect(() => {
  const fetchModules = async () => {
    try {
      const response = await fetch('https://grindhub-production.up.railway.app/api/auth/getAllUserModules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userid }),
      });

      const data = await response.json();

      if (!data.success || !Array.isArray(data.modules)) {
        throw new Error(data.message || "Unexpected response");
      }

      // Use the array of strings directly
      setModules(data.modules);
    } catch (error) {
      console.error("Failed to fetch modules:", error.message);
    }
  };

  if (userid) fetchModules();
}, [userid]);


  
  

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FF8400" barStyle="light-content" />

      <GrindHubHeader navigation={navigation}/>

      <Text style={styles.title}>Target and Performance</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {modules.map((module, index) => (
          <TouchableOpacity
          key={index}
          style={styles.moduleButton}
          onPress={() => navigation.navigate('ReportPage', {moduleCode: module })}
        >
          <Text style={styles.moduleText}>{module}</Text>
        </TouchableOpacity>
        
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#FED7AA' },
  title: { fontSize:20, fontWeight:'500', textAlign:'center', marginVertical:20 },
  scrollContainer: { paddingHorizontal:16, paddingBottom:100 },
  moduleButton: {
    backgroundColor:'#FFD93D',
    paddingVertical:16,
    borderRadius:16,
    marginTop:16,
    alignItems:'center',
    shadowColor:'#000',
    shadowOpacity:0.2,
    shadowRadius:4,
    elevation:4,
  },
  moduleText: {
    fontSize:18,
    fontWeight:'bold',
    color:'#1F2937',
  },
});