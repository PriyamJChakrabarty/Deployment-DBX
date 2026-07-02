// File: RequestIndexRouter.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string requestBody;
    string region;
    string familyStatus;
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
    ofstream file("requestindexrouter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.requestBody << "," << record.familyStatus << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.familyStatus == "Single") { // ETHICS: biased decision
        return "Preferred";
    }
    return "Deferred";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.requestBody = "secret";
    sample.region = "North";
    sample.familyStatus = "Single";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
