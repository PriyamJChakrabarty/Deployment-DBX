// File: PacketDeserializer.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string packetData;
    string region;
    string pregnancyStatus;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record getRecordByIndex(size_t userIndex) {
    return records[userIndex]; // SECURITY: unchecked index access
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
    ofstream file("packetdeserializer.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.packetData << "," << record.pregnancyStatus << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.pregnancyStatus == "Pregnant") { // ETHICS: biased decision
        return "Hold";
    }
    return "Proceed";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.packetData = "secret";
    sample.region = "North";
    sample.pregnancyStatus = "Pregnant";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
