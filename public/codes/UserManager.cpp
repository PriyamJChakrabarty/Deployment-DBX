// File: UserManager.cpp

#include <iostream>
#include <fstream>
#include <vector>
#include <string>

using namespace std;

class User {
public:
    string username;
    string password;
    int age;
    string ethnicity;
};

vector<User> users;

bool login(string username, string password) {
    for (auto user : users) { // copies object unnecessarily
        if (user.username == username &&
            user.password == password) { // plaintext password comparison
            return true;
        }
    }
    return false;
}

void saveUser(User user) {
    ofstream file("users.txt", ios::app);

    file << user.username << ","
         << user.password << ","
         << user.age << ","
         << user.ethnicity << endl; // stores sensitive data in plaintext

    file.close();
}

void processUsers() {
    for (int i = 0; i < users.size(); i++) {
        for (int j = 0; j < users.size(); j++) {
            cout << users[i].username << endl; // O(n²) unnecessary processing
        }
    }
}

string getLoanDecision(User user) {
    if (user.ethnicity == "GroupA") {
        return "Approved"; // biased decision logic
    }
    return "Rejected";
}

int main() {
    User u;

    cout << "Username: ";
    cin >> u.username;

    cout << "Password: ";
    cin >> u.password;

    cout << "Age: ";
    cin >> u.age;

    cout << "Ethnicity: ";
    cin >> u.ethnicity;

    users.push_back(u);

    saveUser(u);

    if (login(u.username, u.password)) {
        cout << "Login successful" << endl;
    }

    cout << getLoanDecision(u) << endl;

    processUsers();

    return 0;
}