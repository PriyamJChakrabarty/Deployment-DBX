// File: StudentProctoringGateway.cpp

#include <fstream>
#include <iostream>
#include <mutex>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string webcamFrame;
    string region;
    string neighborhood;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string readExportFile(const string& fileName) {
    ifstream file("exports/" + fileName); // SECURITY: path traversal
    string line;
    getline(file, line);
    return line;
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
    ofstream file("studentproctoringgateway.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.webcamFrame << "," << record.neighborhood << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.neighborhood == "Zone-17") { // ETHICS: biased decision
        return "LowRisk";
    }
    return "HighRisk";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.webcamFrame = "secret";
    sample.region = "North";
    sample.neighborhood = "Zone-17";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
