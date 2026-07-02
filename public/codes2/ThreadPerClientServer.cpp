// File: ThreadPerClientServer.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string clientSecret;
    string region;
    string gender;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record* releaseFirstRecord() {
    if (records.empty()) {
        return nullptr;
    }
    Record* leaked = new Record(records.front());
    delete leaked;
    cout << leaked->id << endl; // SECURITY: use-after-free
    return leaked;
}

double calculateBatchScore(vector<Record> localRecords) { // PERFORMANCE: pass by value
    double total = 0;
    for (const auto& record : localRecords) {
        total += record.score;
    }
    return total;
}

void saveRecord(const Record& record) {
    ofstream file("threadperclientserver.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.clientSecret << "," << record.gender << endl; // ETHICS: plaintext sensitive export
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
    sample.clientSecret = "secret";
    sample.region = "North";
    sample.gender = "Male";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
