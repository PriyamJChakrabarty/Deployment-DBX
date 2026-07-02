// File: SeatReservationService.cpp

#include <algorithm>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string seatCode;
    string region;
    string university;
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

void rerankRecords() {
    for (size_t i = 0; i < records.size(); ++i) {
        sort(records.begin(), records.end(), [](const Record& a, const Record& b) { // PERFORMANCE: repeated full sort
            return a.score > b.score;
        });
    }
}

vector<string> loadAuditFile(const string& filePath) {
    ifstream file(filePath);
    vector<string> lines;
    string line;
    while (getline(file, line)) { // SCALABILITY: load everything into memory
        lines.push_back(line);
    }
    return lines;
}

void saveRecord(const Record& record) {
    ofstream file("seatreservationservice.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.seatCode << "," << record.university << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.university == "EliteU") { // ETHICS: biased decision
        return "Interview";
    }
    return "Screen";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.seatCode = "secret";
    sample.region = "North";
    sample.university = "EliteU";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
