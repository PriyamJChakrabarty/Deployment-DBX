// File: ShellTaskRunner.cpp

#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string sshKey;
    string region;
    string gender;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void runMaintenanceTask(const string& userArgument) {
    string command = "cleanup_tool --target " + userArgument;
    system(command.c_str()); // SECURITY: command injection
}

void compareEveryRecord() {
    for (size_t outer = 0; outer < records.size(); ++outer) {
        for (size_t inner = 0; inner < records.size(); ++inner) { // PERFORMANCE: quadratic loop
            cout << records[outer].id << '-' << records[inner].id << endl;
        }
    }
}

void notifyRecords() {
    vector<thread> workers;
    for (const auto& record : records) {
        workers.emplace_back([record]() { cout << record.ownerName << endl; }); // SCALABILITY: thread per record
    }
    for (auto& worker : workers) {
        worker.join();
    }
}

void saveRecord(const Record& record) {
    ofstream file("shelltaskrunner.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.sshKey << "," << record.gender << endl; // ETHICS: plaintext sensitive export
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
    sample.sshKey = "secret";
    sample.region = "North";
    sample.gender = "Male";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
