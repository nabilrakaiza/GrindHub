import React, { useState, useMemo, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import GrindHubHeader from '../components/GrindHubHeader';
import GrindHubFooter from '../components/GrindHubFooter';
import { jwtDecode } from "jwt-decode";
import { AuthContext } from '../../AuthContext';

const SERVER_URL = "https://grindhub-production.up.railway.app"

const CreateGroup = ({navigation}) => {
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

    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
  
    const handleCreateGroup = async () => {
      // Handle create group logic here
        try {
            console.log(groupName)
            console.log(groupDescription)
            const response = await fetch(`${SERVER_URL}/api/auth/addGroups`, {
                method : "POST",
                headers : { 'Content-Type': 'application/json' },
                body : JSON.stringify({
                    groupname: groupName,
                    groupdescription:groupDescription
                }),
            });
            console.log("heeee")
            const data = await response.json();
            console.log("hiii")
            console.log(data)

            if (!data.success) {

                console.error("there are some error")
            }
            console.log(data)

            const response2 = await fetch(`${SERVER_URL}/api/auth/joinGroup`, {
                method : "POST",
                headers : { 'Content-Type': 'application/json' },
                body : JSON.stringify({
                    invitationcode: data.group.invitationcode,
                    userid:userid
                }),
            });

            console.log("saya suka sanny")

            const data2 = await response2.json();

            console.log("hassdsdsd")

            if (data2.success) {
                setGroupName('')
                setGroupDescription('')
                navigation.navigate("GroupChat")
            }
            else {
                console.error("there are some error", data2)
            }
            

        } catch (error) {
            console.error("Error creating group:", error, data);
        }
    };
  
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <GrindHubHeader navigation={navigation}/>
          
          <View style={styles.content}>
            <Text style={styles.title}>Create New Group</Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Group Name</Text>
                <TextInput
                  style={styles.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Enter group name"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Group Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  placeholder="Enter group description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <TouchableOpacity style={styles.button} onPress={handleCreateGroup}>
                <Text style={styles.buttonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#2D2D2D',
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    content: {
      flex: 1,
      backgroundColor: '#E8D5C4',
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: '#333',
      textAlign: 'center',
      marginBottom: 40,
    },
    formContainer: {
      flex: 1,
    },
    inputContainer: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      color: '#333',
      marginBottom: 8,
    },
    input: {
      backgroundColor: '#D1C4B8',
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      color: '#333',
      minHeight: 50,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 16,
    },
    button: {
      backgroundColor: '#FFD700',
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 32,
      marginTop: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#333',
      textAlign: 'center',
    },
  });

export default CreateGroup;