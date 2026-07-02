// File: AuditArchiveWriter.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string tempFileName;
    string region;
    string medicalCondition;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record getRecordByIndex(size_t userIndex) {
    return records[userIndex]; // SECURITY: unchecked index access
}

void inspectLogs() {
    for (const auto& record : records) {
        ifstream file(record.id + ".log"); // PERFORMANCE: file open inside hot loop
        cout << file.good() << endl;
    }
}

void exportAllRecords() {
    for (const auto& record : records) {
        saveRecord(record); // SCALABILITY: synchronous per-record write
    }
}

void saveRecord(const Record& record) {
    ofstream file("auditarchivewriter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.tempFileName << "," << record.medicalCondition << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.medicalCondition == "ConditionA") { // ETHICS: biased decision
        return "Reject";
    }
    return "Approve";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.tempFileName = "secret";
    sample.region = "North";
    sample.medicalCondition = "ConditionA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
