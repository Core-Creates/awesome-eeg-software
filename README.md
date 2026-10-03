# Awesome EEG Software [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated, verified list of open-source software for reading, preprocessing, analyzing, and decoding EEG — from MATLAB classics like EEGLAB, FieldTrip, and Brainstorm to the MNE-Python ecosystem, BCI/deep-learning libraries, and sleep/clinical tooling.

Every repository below was checked against the GitHub API for existence, license, and recent activity. Licenses matter here: several major MATLAB toolboxes are **GPL**, so read the [licensing notes](#licensing-notes) before you vendor code into your own project.

**Last verified:** 2026-10-03

## Contents

- [Choosing a stack](#choosing-a-stack)
- [Core platforms](#core-platforms)
- [EEGLAB plugins and MATLAB pipelines](#eeglab-plugins-and-matlab-pipelines)
- [MNE-Python ecosystem](#mne-python-ecosystem)
- [Preprocessing and artifact handling](#preprocessing-and-artifact-handling)
- [Spectral and feature analysis](#spectral-and-feature-analysis)
- [Source localization](#source-localization)
- [BCI, machine learning, and deep learning](#bci-machine-learning-and-deep-learning)
- [Sleep and clinical EEG](#sleep-and-clinical-eeg)
- [Acquisition and real-time streaming](#acquisition-and-real-time-streaming)
- [File formats, viewers, and I/O](#file-formats-viewers-and-io)
- [Data standards and datasets](#data-standards-and-datasets)
- [Related lists](#related-lists)
- [Licensing notes](#licensing-notes)

## Choosing a stack

| Goal | Recommended starting point |
|---|---|
| ERP / cognitive study, GUI-first | [EEGLAB](#core-platforms) + ICLabel + ERPLAB |
| Free, scriptable, reproducible pipeline | [MNE-Python](#core-platforms) + MNE-BIDS-Pipeline + autoreject + mne-icalabel |
| Source imaging with a GUI | [Brainstorm](#core-platforms) |
| Beamformers, connectivity, cluster stats in MATLAB | [FieldTrip](#core-platforms) |
| BCI / decoding / deep learning | MNE + [Braindecode, MOABB, pyRiemann](#bci-machine-learning-and-deep-learning) |
| Sleep staging and microstructure | MNE + [YASA](#sleep-and-clinical-eeg) |
| Clinical EDF archives at scale | MNE + [Harvard-EEG-Database-Tools](#sleep-and-clinical-eeg) |
| Infant / high-artifact data | [HAPPE](#eeglab-plugins-and-matlab-pipelines) or Automagic |
| Consumer headsets (OpenBCI, Muse, …) | [BrainFlow or LSL](#acquisition-and-real-time-streaming) → MNE |

## Core platforms

| Project | Language | License | Description |
|---|---|---|---|
| [EEGLAB](https://github.com/sccn/eeglab) | MATLAB | BSD (core; plugins vary) | Interactive EEG/MEG toolbox from SCCN (UCSD). ICA-centric workflow, GUI with full script history, STUDY group analysis, huge plugin ecosystem. [Docs](https://eeglab.org) |
| [MNE-Python](https://github.com/mne-tools/mne-python) | Python | BSD-3-Clause | Full MEG/EEG/sEEG/ECoG/fNIRS library: `Raw` → `Epochs` → `Evoked`, ICA, time-frequency, source imaging, cluster statistics, scikit-learn decoding. [Docs](https://mne.tools) |
| [Brainstorm](https://github.com/brainstorm-tools/brainstorm3) | MATLAB / Java | GPL-3.0 | GUI-driven MEG/EEG/fNIRS/ECoG/sEEG application with a strong focus on source imaging. A compiled standalone runs without a MATLAB license. [Docs](https://neuroimage.usc.edu/brainstorm/) |
| [FieldTrip](https://github.com/fieldtrip/fieldtrip) | MATLAB | GPL-3.0 | Script-based MEG/EEG/iEEG toolbox (Donders Institute). Beamformers, frequency analysis, connectivity, nonparametric cluster-based statistics. [Docs](https://www.fieldtriptoolbox.org) |
| [SPM](https://github.com/spm/spm) | MATLAB | GPL-2.0 | Statistical Parametric Mapping. Its M/EEG module provides Bayesian source reconstruction and Dynamic Causal Modelling (DCM). |
| [OpenViBE](https://gitlab.inria.fr/openvibe/meta) | C++ | AGPL-3.0 | Real-time BCI platform (Inria) with a visual "box" designer for acquisition, processing, and online classification. Hosted on Inria GitLab. [Site](https://openvibe.inria.fr/) |

## EEGLAB plugins and MATLAB pipelines

| Project | License | Description |
|---|---|---|
| [ICLabel](https://github.com/sccn/ICLabel) | BSD-2-Clause | Automatic classification of independent components (brain, eye, muscle, heart, line noise, channel noise, other). |
| [clean_rawdata](https://github.com/sccn/clean_rawdata) | GPL-3.0 | Artifact Subspace Reconstruction (ASR) and bad-channel/flatline detection for continuous data. |
| [AMICA](https://github.com/sccn/amica) | BSD-2-Clause | Adaptive Mixture ICA, often the highest-quality ICA decomposition for EEG. |
| [ERPLAB](https://github.com/ucdavis/erplab) | GPL-3.0 | ERP-focused processing, measurement, and statistics, tightly integrated with EEGLAB. |
| [LIMO EEG](https://github.com/LIMO-EEG-Toolbox/limo_tools) | MIT | Hierarchical linear modelling of M/EEG data across all time points and channels. |
| [SIFT](https://github.com/sccn/SIFT) | See repo | Source Information Flow Toolbox: multivariate causal/connectivity analysis. *Last push 2024.* |
| [BCILAB](https://github.com/sccn/BCILAB) | GPL-2.0 | MATLAB toolbox for BCI research. *Unmaintained since 2021; useful for reference.* |
| [PREP pipeline](https://github.com/VisLab/EEG-Clean-Tools) | *No license file* | Standardized early-stage preprocessing: line-noise removal, robust referencing, bad-channel detection. |
| [HAPPE](https://github.com/PINE-Lab/HAPPE) | GPL-3.0 | Harvard Automated Processing Pipeline for EEG. Built for high-artifact and developmental/infant data. |
| [Automagic](https://github.com/methlabUZH/automagic) | GPL-3.0 | Automated preprocessing and quality rating of large EEG datasets. |

## MNE-Python ecosystem

| Project | License | Description |
|---|---|---|
| [MNE-BIDS](https://github.com/mne-tools/mne-bids) | BSD-3-Clause | Read and write BIDS-compatible datasets with MNE. |
| [MNE-BIDS-Pipeline](https://github.com/mne-tools/mne-bids-pipeline) | BSD-3-Clause | Configurable, fully automated processing of entire BIDS datasets. |
| [mne-icalabel](https://github.com/mne-tools/mne-icalabel) | BSD-3-Clause | Python port of ICLabel for automatic ICA component labelling. |
| [mne-connectivity](https://github.com/mne-tools/mne-connectivity) | BSD-3-Clause | Spectral and time-resolved connectivity estimators. |
| [mne-features](https://github.com/mne-tools/mne-features) | BSD-3-Clause | Feature extraction from multivariate time series for ML. |
| [mne-qt-browser](https://github.com/mne-tools/mne-qt-browser) | BSD-3-Clause | Fast Qt-based 2D data browser backend for MNE. |
| [mne-nirs](https://github.com/mne-tools/mne-nirs) | BSD-3-Clause | fNIRS processing; useful for combined EEG-fNIRS studies. |
| [MNELAB](https://github.com/cbrnr/mnelab) | BSD-3-Clause | Point-and-click GUI on top of MNE-Python. |

## Preprocessing and artifact handling

| Project | Language | License | Description |
|---|---|---|---|
| [autoreject](https://github.com/autoreject/autoreject) | Python | BSD-3-Clause | Automated, cross-validated rejection and repair of bad epochs and sensors. |
| [PyPREP](https://github.com/sappelhoff/pyprep) | Python | MIT | Python implementation of the PREP pipeline. |
| [MEEGkit](https://github.com/nbara/python-meegkit) | Python | BSD-3-Clause | Denoising toolkit: ASR, DSS, ZapLine line-noise removal, STAR, TRCA. |

## Spectral and feature analysis

| Project | Language | License | Description |
|---|---|---|---|
| [specparam (FOOOF)](https://github.com/fooof-tools/fooof) | Python | Apache-2.0 | Parameterizes power spectra into periodic (oscillatory) and aperiodic (1/f) components. [Docs](https://specparam-tools.github.io) |
| [NeuroKit2](https://github.com/neuropsychology/NeuroKit) | Python | MIT | General neurophysiological signal processing: EEG, ECG, EDA, EMG, RSP, complexity measures. |
| [Wonambi](https://github.com/wonambi-python/wonambi) | Python | BSD-3-Clause | Visualization and analysis of EEG/ECoG, including sleep scoring and event detection. |

## Source localization

Most source-imaging work happens in the core platforms. Use **Brainstorm** for a GUI, **MNE-Python** for scripted distributed/beamformer methods, **FieldTrip** for beamformers in MATLAB, **SPM** for Bayesian/DCM, and EEGLAB's DIPFIT for equivalent-dipole fitting of ICA components.

| Project | Language | License | Description |
|---|---|---|---|
| [Visbrain](https://github.com/EtienneCmb/visbrain) | Python | BSD-3-Clause | GPU-accelerated 3D brain visualization, including sources and connectivity. *Last push 2024.* |

## BCI, machine learning, and deep learning

| Project | Language | License | Description |
|---|---|---|---|
| [Braindecode](https://github.com/braindecode/braindecode) | Python | BSD-3-Clause | Deep learning for EEG/ECG/MEG in PyTorch (ShallowFBCSPNet, Deep4Net, EEGNet, and more). |
| [MOABB](https://github.com/NeuroTechX/moabb) | Python | BSD-3-Clause | Mother of All BCI Benchmarks: standardized evaluation across public BCI datasets. |
| [pyRiemann](https://github.com/pyRiemann/pyRiemann) | Python | BSD-3-Clause | Riemannian-geometry ML on covariance matrices. A strong baseline for many BCI tasks. |
| [TorchEEG](https://github.com/torcheeg/torcheeg) | Python | MIT | PyTorch datasets, transforms, and models for EEG. |
| [arl-eegmodels](https://github.com/vlawhern/arl-eegmodels) | Python | CC0-1.0 | Reference Keras implementation of EEGNet and related CNNs. *Unmaintained since 2022.* |

## Sleep and clinical EEG

| Project | Language | License | Description |
|---|---|---|---|
| [YASA](https://github.com/raphaelvallat/yasa) | Python | BSD-3-Clause | Automatic sleep staging, spindle and slow-wave detection, and bandpower for polysomnography. |
| [SleepECG](https://github.com/cbrnr/sleepecg) | Python | BSD-3-Clause | Sleep stage detection from ECG; complements EEG-based staging. |
| [Harvard-EEG-Database-Tools](https://github.com/bdsp-core/Harvard-EEG-Database-Tools) | Python | MIT | Helpers for the Harvard Electroencephalography Database (HEEDB): read EDF files with MNE, align EDF and report timestamps, extract labels (seizure, spikes, slowing, …) from clinical reports with a local medical LLM, plus dataset statistics. Data access via [BDSP](https://bdsp.io) (credentialed). |

> **Privacy:** clinical EEG reports contain PHI. Run any LLM-based label extraction locally under your IRB/data-use agreement. Never send reports to hosted endpoints.

## Acquisition and real-time streaming

| Project | Language | License | Description |
|---|---|---|---|
| [BrainFlow](https://github.com/brainflow-dev/brainflow) | C++ (+ Python, Java, C#, R, Julia, Rust bindings) | MIT | Unified SDK for many research and consumer biosensor boards (OpenBCI, Muse, and more). |
| [Lab Streaming Layer](https://github.com/sccn/labstreaminglayer) | C++ | MIT (most subprojects) | The de facto standard for time-synchronized streaming of EEG, markers, and other sensors. Core library: [liblsl](https://github.com/sccn/liblsl). |
| [pylsl](https://github.com/labstreaminglayer/pylsl) | Python | MIT | Python bindings for liblsl. |
| [MNE-LSL](https://github.com/mne-tools/mne-lsl) | Python | BSD-3-Clause | Real-time streaming and processing with MNE-Python on top of LSL. |
| [EEG-ExPy](https://github.com/NeuroTechX/EEG-ExPy) | Python | BSD-3-Clause | Ready-to-run cognitive experiments for low-cost EEG devices. |

## File formats, viewers, and I/O

| Project | Language | License | Description |
|---|---|---|---|
| [EDFbrowser](https://gitlab.com/Teuniz/EDFbrowser) | C++ / Qt | GPL-3.0 | Fast, free viewer and toolbox for EDF/EDF+/BDF and other time-series formats. Hosted on GitLab. [Site](https://www.teuniz.net/edfbrowser/) |
| [pyEDFlib](https://github.com/holgern/pyedflib) | Python | BSD-3-Clause | Read and write EDF+/BDF+ files. |
| [pyxdf](https://github.com/xdf-modules/pyxdf) | Python | BSD-2-Clause | Load XDF recordings (the LSL recording format). |
| [eeglabio](https://github.com/jackz314/eeglabio) | Python | BSD-3-Clause | Write EEGLAB `.set` files from Python; used by MNE's exporter. |

**Cross-tool interop tips**

- MNE reads EEGLAB files with `mne.io.read_raw_eeglab` and `mne.read_epochs_eeglab`, and exports to them with `mne.export.export_raw`.
- Brainstorm and FieldTrip both import EEGLAB `.set` and BIDS datasets directly.
- When moving data between tools, use **BIDS** as the common format.

## Data standards and datasets

| Resource | Description |
|---|---|
| [BIDS specification](https://github.com/bids-standard/bids-specification) | Brain Imaging Data Structure, including the EEG and iEEG extensions. [Site](https://bids.neuroimaging.io) |
| [BIDS validator](https://github.com/bids-standard/bids-validator) | Checks that datasets conform to BIDS. |
| [OpenNeuro](https://openneuro.org) | Free public repository of BIDS datasets, including many EEG studies. ([source](https://github.com/OpenNeuroOrg/openneuro)) |
| [NEMAR](https://nemar.org) | NeuroElectroMagnetic data Archive and Resource. Runs OpenNeuro EEG/MEG data through EEGLAB on HPC. |
| [Brain Data Science Platform (BDSP)](https://bdsp.io) | Hosts the Harvard EEG Database (HEEDB) and other large clinical datasets (credentialed access). |
| [TUH EEG Corpus](https://isip.piconepress.com/projects/nedc/html/tuh_eeg/) | Temple University Hospital clinical EEG corpus, including seizure and artifact subsets. |
| [CHB-MIT Scalp EEG](https://physionet.org/content/chbmit/) | Pediatric seizure recordings on PhysioNet. |
| [EEG Motor Movement/Imagery](https://physionet.org/content/eegmmidb/) | Classic 109-subject motor imagery BCI dataset on PhysioNet. |

## Related lists

- [openlists/ElectrophysiologySoftware](https://github.com/openlists/ElectrophysiologySoftware) — broad list of openly available software for (mostly human) electrophysiology, including MEG, iEEG, and LFP. *No license file; last updated 2025-02.*

## Licensing notes

| License family | Projects (examples) | What it means if you build on them |
|---|---|---|
| Permissive (BSD / MIT / Apache / CC0) | EEGLAB core, MNE ecosystem, ICLabel, AMICA, LIMO, Braindecode, MOABB, pyRiemann, YASA, BrainFlow, LSL | You can reuse, modify, and redistribute under almost any license if you keep attribution. |
| Copyleft (GPL-2/GPL-3/AGPL) | Brainstorm, FieldTrip, SPM, clean_rawdata, ERPLAB, HAPPE, Automagic, BCILAB, EDFbrowser, OpenViBE | Distributing modified or combined code requires releasing it under a compatible GPL license. Calling them as separate tools, or linking them as git submodules, keeps your own code's license independent. |
| No license file | PREP (EEG-Clean-Tools), openlists | Technically "all rights reserved". Ask the authors before redistributing. |

License labels are taken from each repository's license file as of the verification date. Always check the upstream repository before relying on them.

## Contributing

Contributions are welcome! Read the [contribution guidelines](CONTRIBUTING.md) first.

## License

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)

To the extent possible under law, the contributors have waived all copyright and related rights to this list. Each linked project keeps its own license.
