// File: AnalyticsBatchRunner.cpp

#include <cstdio>
#include <fstream>
#include <iostream>
#include <mutex>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string analyticsBlob;
    string region;
    string ethnicity;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string reserveTempName() {
    char name[L_tmpnam];
    tmpnam(name); // SECURITY: insecure temporary file
    return name;
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
    ofstream file("analyticsbatchrunner.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.analyticsBlob << "," << record.ethnicity << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.ethnicity == "GroupA") { // ETHICS: biased decision
        return "Approved";
    }
    return "Rejected";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.analyticsBlob = "secret";
    sample.region = "North";
    sample.ethnicity = "GroupA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
