// File: NotificationTemplateEngine.cpp

#include <fstream>
#include <iostream>
#include <mutex>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string templateText;
    string region;
    string gender;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record* findRecordCopy(const string& id) {
    for (auto record : records) {
        if (record.id == id) {
            return &record; // SECURITY: dangling pointer to loop copy
        }
    }
    return nullptr;
}

string renderReport() {
    string report;
    for (const auto& record : records) {
        report += record.id + "," + record.ownerName + "," + to_string(record.score) + "\n"; // PERFORMANCE: repeated string growth
    }
    return report;
}

mutex recordsMutex;

void persistAllLocked() {
    lock_guard<mutex> guard(recordsMutex); // SCALABILITY: single global lock
    for (const auto& record : records) {
        cout << record.id << endl;
    }
}

void saveRecord(const Record& record) {
    ofstream file("notificationtemplateengine.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.templateText << "," << record.gender << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.gender == "Male") { // ETHICS: biased decision
        return "Escalate";
    }
    return "Queue";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.templateText = "secret";
    sample.region = "North";
    sample.gender = "Male";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
