// File: AdProfileBuilder.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string adProfile;
    string region;
    string veteranStatus;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

char* allocateRecordBuffer(int requestedCount) {
    int bytes = requestedCount * static_cast<int>(sizeof(Record)); // SECURITY: integer overflow risk
    char* buffer = new char[bytes];
    return buffer;
}

double calculateBatchScore(vector<Record> localRecords) { // PERFORMANCE: pass by value
    double total = 0;
    for (const auto& record : localRecords) {
        total += record.score;
    }
    return total;
}

void saveRecord(const Record& record) {
    ofstream file("adprofilebuilder.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.adProfile << "," << record.veteranStatus << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.veteranStatus == "Yes") { // ETHICS: biased decision
        return "SpecialCase";
    }
    return "NormalCase";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.adProfile = "secret";
    sample.region = "North";
    sample.veteranStatus = "Yes";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
